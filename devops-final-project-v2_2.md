# DevOps Final Project — Full Lab Guide (v2)
### Flask · MongoDB · Docker · GitHub Actions · Kubernetes · Helm · Terraform · AWS EKS · Security

> **How to use this guide**
> Work through stages in order. Never skip the homework section at the start of each stage. At the end of every stage, run the full checklist before moving on. If even one item fails, fix it before continuing.
>
> **Your existing app (Flask + MongoDB, frontend + backend) stays as-is.** The only code change required across this entire project is adding a `/health` endpoint to your Flask backend if it doesn't already have one. Everything else is infrastructure built *around* your app.

---

## Overview — what you're building

A production-grade microservices platform on AWS EKS:

- **Backend** — your existing Flask API + MongoDB
- **Frontend** — your existing frontend, served via Nginx
- **CI/CD** — GitHub Actions: build → scan (Trivy) → push to ECR → deploy via Helm
- **Kubernetes** — EKS with NetworkPolicy, HPA, probes, non-root containers
- **Helm** — your K8s manifests as a templated chart with per-environment values
- **Infrastructure** — Terraform provisions everything: VPC, EKS, IAM (including IRSA)
- **Secrets** — AWS Secrets Manager + External Secrets Operator, zero hardcoded credentials
- **Security validation** — a final pass proving every security control actually works

**Cost:** Stages 1–5 are completely free. AWS costs only begin in Stage 6 when you run `terraform apply`.

---

## Final project folder structure

```
my-devops-project/
├── backend/
│   ├── app.py                  # existing — add /health if missing
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── index.html              # existing
│   └── Dockerfile
├── k8s/                         # Stage 3 — raw YAML (learning step)
│   ├── namespace.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── ingress.yaml
│   ├── networkpolicy.yaml
│   └── hpa.yaml
├── helm/
│   └── my-devops-project/       # Stage 4 — Helm chart (replaces k8s/ for deploys)
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-staging.yaml
│       ├── values-prod.yaml
│       └── templates/
│           ├── _helpers.tpl
│           ├── backend-deployment.yaml
│           ├── backend-service.yaml
│           ├── frontend-deployment.yaml
│           ├── frontend-service.yaml
│           ├── ingress.yaml
│           ├── networkpolicy.yaml
│           ├── hpa.yaml
│           └── serviceaccount.yaml
├── terraform/                    # Stage 5
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── irsa.tf
│   └── backend.tf
├── .github/
│   └── workflows/
│       └── deploy.yml
├── docker-compose.yml
├── DECISIONS.md
└── README.md
```

---

---

# Stage 1 — Docker (free)

## Homework before you start

**Multi-stage builds** — search "Docker multi-stage build python" and read one short article. One stage installs dependencies, a second clean stage runs the app. Result: small production image, no build tools inside.

**Why non-root** — by default containers run as `root`. If your app is exploited, the attacker gets root inside the container. A non-root user limits the blast radius.

**Why .dockerignore** — without it, `COPY . .` copies `__pycache__`, `.env`, `.git`, local secrets into your image. Keeps the image clean and small.

Take 30 minutes before continuing.

---

## Step 1 — Confirm your app structure

You already have a working Flask + MongoDB backend and a frontend. Confirm the folder layout matches:

```
my-devops-project/
├── backend/
│   ├── app.py
│   └── requirements.txt
└── frontend/
    └── index.html (or your existing frontend files)
```

---

## Step 2 — Add the /health endpoint (only code change in this entire project)

Open `backend/app.py` and confirm you have something like this:

```python
@app.route("/health")
def health():
    return jsonify({"status": "healthy"})
```

If you don't have it, add it now. This is the only endpoint Kubernetes will use for liveness and readiness probes later. It should not touch MongoDB — keep it lightweight so it always responds fast, even if the database is briefly unreachable.

---

## Step 3 — Write the backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn
COPY . .

RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "app:app"]
```

Make sure `gunicorn` is in your `requirements.txt`. If not, add `gunicorn==22.0.0`.

**What every line does:**

- `FROM python:3.12-slim AS builder` — first stage, just for installing deps.
- `COPY requirements.txt .` then `RUN pip install` — cached separately from your app code. If only your code changes, Docker reuses this layer.
- `FROM python:3.12-slim` (second time) — fresh clean image, nothing from builder unless copied explicitly.
- `addgroup / adduser` — creates non-root user `appuser`.
- `COPY --from=builder ...` — only the installed packages and gunicorn binary come across, not pip or build tools.
- `COPY . .` — your actual app code (respecting `.dockerignore`).
- `USER appuser` — container now runs as non-root.
- `CMD` — gunicorn with 2 workers, production-grade WSGI server.

---

## Step 4 — Write the frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM nginx:alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY . /usr/share/nginx/html

RUN chown -R appuser:appgroup /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Adjust the `COPY` source if your frontend files live in a subfolder.

---

## Step 5 — Write .dockerignore files

`backend/.dockerignore`:

```
__pycache__
*.pyc
*.pyo
.env
.git
.gitignore
*.md
venv/
.venv/
```

`frontend/.dockerignore`:

```
.git
.gitignore
*.md
node_modules/
```

---

## Step 6 — docker-compose for local testing

Create `docker-compose.yml` in the root:

```yaml
version: "3.9"

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://host.docker.internal:27017/appdb
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: frontend
    ports:
      - "8080:80"
    depends_on:
      - backend
    restart: unless-stopped
```

Adjust `MONGO_URI` to match how your app reads its MongoDB connection — if you're running MongoDB locally (not in Docker), `host.docker.internal` lets the container reach your Mac's localhost. If MongoDB Atlas, just use your Atlas URI here for local testing.

---

## Step 7 — Build and run

```bash
docker compose up --build
```

---

## Step 8 — Verify

```bash
curl http://localhost:5000/health
curl http://localhost:5000/
docker ps
docker images | grep my-devops-project
```

Open `http://localhost:8080` — your existing frontend should load and reach the backend.

---

## Step 9 — Inspect

```bash
docker exec -it backend sh
whoami        # should print appuser, not root
ls -la /app
exit

docker compose down
```

---

## Stage 1 checklist

- [ ] `curl http://localhost:5000/health` returns `{"status": "healthy"}`
- [ ] Frontend loads at `http://localhost:8080` and successfully talks to the backend
- [ ] `docker ps` shows both containers running
- [ ] `whoami` inside the backend container returns `appuser`
- [ ] `docker images` shows backend reasonably small (multi-stage working)
- [ ] `docker compose down` stops everything cleanly

---

---

# Stage 2 — GitHub Actions CI/CD (free)

## Homework before you start

**Workflow structure** — a workflow is YAML in `.github/workflows/`. Jobs contain steps. Steps run sequentially; jobs can run in parallel. Understand this skeleton before reading any YAML.

**GitHub Secrets** — repo → Settings → Secrets and variables → Actions. Encrypted variables your workflow can use without exposing them in code.

**ECR** — Amazon Elastic Container Registry, your private Docker registry in AWS.

**Trivy** — open-source scanner for CVEs in your images. `exit-code: 1` on CRITICAL means a vulnerable image never gets pushed.

Take 30 minutes before continuing.

---

## Step 1 — Push your code to GitHub

```bash
cd my-devops-project
git init
git add .
git commit -m "Initial commit — Docker setup"
git remote add origin https://github.com/YOUR_USERNAME/my-devops-project.git
git push -u origin main
```

---

## Step 2 — IAM user for GitHub Actions

AWS Console → IAM → Users → Create user → `github-actions-deployer`.

Attach:
- `AmazonEC2ContainerRegistryFullAccess`
- `AmazonEKSClusterPolicy`

Create access key → "Application running outside AWS" → download the CSV.

---

## Step 3 — Add GitHub secrets

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | from CSV |
| `AWS_SECRET_ACCESS_KEY` | from CSV |
| `AWS_REGION` | `us-east-1` |

---

## Step 4 — Create ECR repositories

AWS Console → ECR → Create repository:

- `my-devops-project/backend`
- `my-devops-project/frontend`

Note your 12-digit AWS account ID.

---

## Step 5 — Write the CI workflow (build, scan, push only — deploy comes in Stage 6)

Create `.github/workflows/deploy.yml`:

```yaml
name: Build, Scan, and Push

on:
  push:
    branches:
      - main

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

jobs:
  build-and-push:
    name: Build, scan, and push images
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build backend image
        run: |
          docker build -t $ECR_REGISTRY/my-devops-project/backend:${{ github.sha }} ./backend
          docker tag $ECR_REGISTRY/my-devops-project/backend:${{ github.sha }} \
                     $ECR_REGISTRY/my-devops-project/backend:latest

      - name: Scan backend image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/my-devops-project/backend:${{ github.sha }}
          format: table
          exit-code: 1
          severity: CRITICAL

      - name: Push backend image to ECR
        run: |
          docker push $ECR_REGISTRY/my-devops-project/backend:${{ github.sha }}
          docker push $ECR_REGISTRY/my-devops-project/backend:latest

      - name: Build frontend image
        run: |
          docker build -t $ECR_REGISTRY/my-devops-project/frontend:${{ github.sha }} ./frontend
          docker tag $ECR_REGISTRY/my-devops-project/frontend:${{ github.sha }} \
                     $ECR_REGISTRY/my-devops-project/frontend:latest

      - name: Scan frontend image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.ECR_REGISTRY }}/my-devops-project/frontend:${{ github.sha }}
          format: table
          exit-code: 1
          severity: CRITICAL

      - name: Push frontend image to ECR
        run: |
          docker push $ECR_REGISTRY/my-devops-project/frontend:${{ github.sha }}
          docker push $ECR_REGISTRY/my-devops-project/frontend:latest
```

Replace `YOUR_ACCOUNT_ID`. The deploy job gets added later in Stage 6.

**Why tag with `github.sha`?** Every commit gets a unique image tag — you can roll back to any previous build precisely. Helm will use this tag in Stage 6.

---

## Step 6 — Push and watch it run

```bash
git add .
git commit -m "Add GitHub Actions CI pipeline"
git push
```

Repo → Actions tab. Watch each step, especially the Trivy output.

---

## Stage 2 checklist

- [ ] Push to main triggers the workflow
- [ ] Trivy scan runs and shows output
- [ ] Both images appear in ECR
- [ ] Images tagged with both `latest` and commit SHA
- [ ] Full pipeline green, no red steps

---

---

# Stage 3 — Kubernetes on minikube — raw YAML (free)

## Homework before you start

**Core objects:** Pod, Deployment, Service, Ingress, ConfigMap, Secret, Namespace, NetworkPolicy, HPA — make sure you can define each in one sentence before writing YAML.

**Why raw YAML first, then Helm?** Helm templates raw YAML. If you don't understand what the YAML looks like without templating, the `{{ }}` syntax in Stage 4 will feel like magic instead of substitution. This stage is the "before" picture.

**minikube** — single-node local K8s cluster, same API as EKS, zero AWS cost.

Take 45 minutes before continuing.

---

## Step 1 — Install and start minikube

```bash
brew install kubectl
brew install minikube

minikube start --cpus=2 --memory=4096
kubectl get nodes

minikube addons enable ingress
minikube addons enable metrics-server
```

`metrics-server` is required for HPA.

---

## Step 2 — Namespace

`k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: devops-project
  labels:
    name: devops-project
```

```bash
kubectl apply -f k8s/namespace.yaml
kubectl get namespaces
```

---

## Step 3 — Backend Deployment + Service

`k8s/backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: devops-project
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: backend
          image: my-devops-project-backend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 5000
          env:
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: mongo-uri
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "250m"
              memory: "256Mi"
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
```

**Key parts:**

- `runAsNonRoot: true` — K8s enforces no root in this deployment.
- `MONGO_URI` from a Secret, not hardcoded — this is the pattern that External Secrets will plug into later.
- `resources.requests/limits` — HPA needs `requests` to calculate scaling; `limits` caps and protects the node.
- `livenessProbe` / `readinessProbe` — restart vs traffic-routing, two different jobs.
- `imagePullPolicy: Never` — minikube uses your locally built image.

For now, create a temporary local Secret so it runs (this gets replaced by External Secrets in Stage 6):

```bash
kubectl create secret generic backend-secrets \
  --from-literal=mongo-uri="mongodb://host.minikube.internal:27017/appdb" \
  -n devops-project
```

`k8s/backend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: devops-project
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: ClusterIP
```

---

## Step 4 — Frontend Deployment + Service

`k8s/frontend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: devops-project
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: frontend
          image: my-devops-project-frontend:latest
          imagePullPolicy: Never
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "100m"
              memory: "128Mi"
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 3
            periodSeconds: 10
```

`k8s/frontend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: devops-project
spec:
  selector:
    app: frontend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

---

## Step 5 — Ingress

`k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
  namespace: devops-project
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: devops-project.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: backend-service
                port:
                  number: 80
```

```bash
echo "$(minikube ip) devops-project.local" | sudo tee -a /etc/hosts
```

---

## Step 6 — NetworkPolicy (zero-trust)

`k8s/networkpolicy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: devops-project
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: devops-project
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 5000

---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-frontend
  namespace: devops-project
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 80
```

Deny-all first, then explicit allows. Zero-trust networking.

---

## Step 7 — HPA

`k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: devops-project
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 5
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

## Step 8 — Build images into minikube and deploy

```bash
eval $(minikube docker-env)

docker build -t my-devops-project-backend:latest ./backend
docker build -t my-devops-project-frontend:latest ./frontend

kubectl apply -f k8s/
```

---

## Step 9 — Verify

```bash
kubectl get all -n devops-project
kubectl get pods -n devops-project -w
kubectl get ingress -n devops-project
kubectl get hpa -n devops-project
kubectl logs -n devops-project -l app=backend
```

Browser: `http://devops-project.local`

---

## Step 10 — Break things on purpose

```bash
kubectl delete pod -n devops-project -l app=backend
kubectl get pods -n devops-project -w

kubectl run test-pod --image=busybox -n devops-project --rm -it -- sh
wget -qO- http://backend-service:80
# should time out — NetworkPolicy blocks it
exit
```

---

## Stage 3 checklist

- [ ] All pods `Running`, `2/2` ready
- [ ] Browser at `http://devops-project.local` shows the frontend
- [ ] `/health` reachable through Ingress at `/api/health`
- [ ] HPA shows targets
- [ ] Deleted pod auto-restarts
- [ ] NetworkPolicy blocks the unlabelled test pod
- [ ] `whoami` inside backend pod returns non-root user

---

---

# Stage 4 — Helm (free, ~1-1.5 days)

## Homework before you start

**What is a chart?** A Helm chart is a folder with a defined structure: `Chart.yaml` (metadata), `values.yaml` (default config), `templates/` (your K8s YAML with placeholders).

**What is templating?** `{{ .Values.image.tag }}` in a template file gets replaced with the real value from `values.yaml` (or an override) when you run `helm template` or `helm install`. Run `helm template ./mychart` after building it — read the output. It's just your Stage 3 YAML with values filled in.

**Why per-environment values files?** `values.yaml` holds defaults. `values-staging.yaml` and `values-prod.yaml` override only what differs (replica counts, resource limits, image tags). Your pipeline picks which file to use at deploy time.

**The debug loop** — `helm template` (render without deploying), `helm install --dry-run --debug` (render + validate against the cluster without applying). Use these constantly; Helm's first error messages are often confusing without them.

Take 1-2 hours before continuing.

---

## Step 1 — Install Helm

```bash
brew install helm
helm version
```

---

## Step 2 — Create the chart skeleton

```bash
mkdir -p helm/my-devops-project/templates
```

`helm/my-devops-project/Chart.yaml`:

```yaml
apiVersion: v2
name: my-devops-project
description: Flask + MongoDB microservices platform
version: 0.1.0
appVersion: "1.0"
```

---

## Step 3 — values.yaml (defaults)

`helm/my-devops-project/values.yaml`:

```yaml
backend:
  image:
    repository: my-devops-project-backend
    tag: latest
  replicaCount: 2
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 250m
      memory: 256Mi

frontend:
  image:
    repository: my-devops-project-frontend
    tag: latest
  replicaCount: 2
  resources:
    requests:
      cpu: 50m
      memory: 64Mi
    limits:
      cpu: 100m
      memory: 128Mi

namespace: devops-project

ingress:
  host: devops-project.local

hpa:
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilization: 70

serviceAccount:
  name: backend-sa
  roleArn: ""   # filled in for AWS — IRSA role ARN
```

---

## Step 4 — _helpers.tpl

`helm/my-devops-project/templates/_helpers.tpl`:

```yaml
{{- define "my-devops-project.fullname" -}}
{{- .Release.Name }}-{{ .Chart.Name }}
{{- end -}}

{{- define "my-devops-project.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
```

This avoids repeating the same label block in every template — `{{ include "my-devops-project.labels" . }}` pulls it in wherever needed.

---

## Step 5 — Convert backend Deployment + Service to templates

`helm/my-devops-project/templates/backend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: {{ .Values.namespace }}
spec:
  replicas: {{ .Values.backend.replicaCount }}
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      serviceAccountName: {{ .Values.serviceAccount.name }}
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: backend
          image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
          imagePullPolicy: {{ .Values.backend.image.pullPolicy | default "IfNotPresent" }}
          ports:
            - containerPort: 5000
          env:
            - name: MONGO_URI
              valueFrom:
                secretKeyRef:
                  name: backend-secrets
                  key: mongo-uri
          resources:
            {{- toYaml .Values.backend.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /health
              port: 5000
            initialDelaySeconds: 5
            periodSeconds: 10
```

`helm/my-devops-project/templates/backend-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: {{ .Values.namespace }}
spec:
  selector:
    app: backend
  ports:
    - protocol: TCP
      port: 80
      targetPort: 5000
  type: ClusterIP
```

**What changed vs Stage 3:** every hardcoded value (`replicas: 2`, image name, namespace, resources) is now a `{{ .Values.x }}` reference. `{{- toYaml .Values.backend.resources | nindent 12 }}` dumps the whole `resources` block from values.yaml with correct indentation — a common Helm pattern worth understanding, not just copying.

---

## Step 6 — Convert frontend, Ingress, NetworkPolicy, HPA the same way

Apply the same pattern to `frontend-deployment.yaml`, `frontend-service.yaml`, `ingress.yaml`, `networkpolicy.yaml`, `hpa.yaml` — copy your Stage 3 YAML into `templates/`, and replace hardcoded values with `{{ .Values.x }}` references using the table below as a map:

| Stage 3 hardcoded value | Helm template reference |
|---|---|
| `namespace: devops-project` | `namespace: {{ .Values.namespace }}` |
| `replicas: 2` (frontend) | `replicas: {{ .Values.frontend.replicaCount }}` |
| `image: my-devops-project-frontend:latest` | `image: "{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"` |
| `host: devops-project.local` | `host: {{ .Values.ingress.host }}` |
| `minReplicas: 2` / `maxReplicas: 5` | `{{ .Values.hpa.minReplicas }}` / `{{ .Values.hpa.maxReplicas }}` |
| `averageUtilization: 70` | `{{ .Values.hpa.targetCPUUtilization }}` |

Do this by hand, file by file. This is the exercise that builds the muscle memory.

---

## Step 7 — ServiceAccount template (prepares for IRSA in Stage 5/6)

`helm/my-devops-project/templates/serviceaccount.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: {{ .Values.serviceAccount.name }}
  namespace: {{ .Values.namespace }}
  {{- if .Values.serviceAccount.roleArn }}
  annotations:
    eks.amazonaws.com/role-arn: {{ .Values.serviceAccount.roleArn }}
  {{- end }}
```

On minikube, `roleArn` is empty so the annotation is skipped — the `{{- if }}` conditional means this template only adds the AWS-specific annotation when running on real EKS with a role ARN set. This is the bridge between Helm and Terraform's IRSA output in Stage 6.

---

## Step 8 — Per-environment values files

`helm/my-devops-project/values-staging.yaml`:

```yaml
backend:
  replicaCount: 1
frontend:
  replicaCount: 1
ingress:
  host: staging.devops-project.local
```

`helm/my-devops-project/values-prod.yaml`:

```yaml
backend:
  replicaCount: 2
frontend:
  replicaCount: 2
ingress:
  host: devops-project.local
```

These only override what differs from `values.yaml`. Everything else inherits the default.

---

## Step 9 — Render and debug locally

```bash
# Render the templates to see the final YAML — read this output carefully
helm template my-devops-project ./helm/my-devops-project

# Validate against the cluster without applying anything
helm install my-devops-project ./helm/my-devops-project \
  --dry-run --debug -n devops-project
```

Fix any errors here before the real install. Common first-time errors: indentation mismatches after `toYaml | nindent`, missing `{{- end }}`, or referencing a `.Values.x` path that doesn't exist in `values.yaml`.

---

## Step 10 — Deploy with Helm to minikube

First, delete the Stage 3 raw resources so Helm starts clean:

```bash
kubectl delete -f k8s/
```

Recreate the Secret (still manual on minikube — External Secrets comes in Stage 6):

```bash
kubectl create secret generic backend-secrets \
  --from-literal=mongo-uri="mongodb://host.minikube.internal:27017/appdb" \
  -n devops-project
```

Build images and deploy:

```bash
eval $(minikube docker-env)
docker build -t my-devops-project-backend:latest ./backend
docker build -t my-devops-project-frontend:latest ./frontend

helm upgrade --install my-devops-project ./helm/my-devops-project \
  -n devops-project --create-namespace \
  -f helm/my-devops-project/values.yaml
```

`upgrade --install` — installs if it doesn't exist, upgrades if it does. This single command is what your CI/CD pipeline will run in Stage 6.

---

## Step 11 — Verify

```bash
helm list -n devops-project
kubectl get all -n devops-project
```

Browser: `http://devops-project.local` should still work exactly as in Stage 3 — same result, now templated and environment-aware.

---

## Stage 4 checklist

- [ ] `helm template` renders without errors
- [ ] `helm install --dry-run --debug` validates cleanly
- [ ] `helm upgrade --install` deploys successfully to minikube
- [ ] App works identically to Stage 3 at `http://devops-project.local`
- [ ] You can explain what `values.yaml` vs `values-staging.yaml` vs `values-prod.yaml` each do
- [ ] You can explain what the `serviceAccount.roleArn` conditional is preparing for

---

---

# Stage 5 — Terraform (free, write only — do not apply yet)

## Homework before you start

**State, plan, modules, VPC** — same as before: state tracks what exists, plan previews changes, modules are reusable blocks, VPC is your isolated network with public/private subnets.

**IRSA (IAM Roles for Service Accounts)** — this is new for this version. Normally, giving a pod AWS permissions means either no permissions (can't reach Secrets Manager) or baking AWS access keys into the pod (a major security risk — if the pod is compromised, the keys are compromised). IRSA solves this: AWS issues short-lived credentials directly to a pod based on its Kubernetes ServiceAccount, via an OIDC trust relationship between EKS and IAM. No keys stored anywhere, ever.

Search "EKS IRSA explained" and read one article focused on the OIDC provider concept before continuing. This is the security concept most juniors haven't touched, and it's worth the extra 30 minutes.

Take 1 hour before continuing.

---

## Step 1 — Install Terraform

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
terraform --version
```

---

## Step 2 — Remote state backend

`terraform/backend.tf`:

```hcl
terraform {
  backend "s3" {
    bucket         = "my-devops-project-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

S3 bucket + DynamoDB table get created manually right before Stage 6. For now, just write this file.

---

## Step 3 — Variables

`terraform/variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "my-devops-project"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}
```

Note: no `db_password` variable this time — MongoDB connection details will come from AWS Secrets Manager via External Secrets in Stage 6, not from a Terraform-managed RDS instance. If your MongoDB is hosted on Atlas or elsewhere, Terraform doesn't need to provision a database at all. (If you do want RDS for a different reason, it slots in the same way as the original guide — just add `rds.tf` back.)

---

## Step 4 — VPC

`terraform/vpc.tf`:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.project_name}-vpc"
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}
```

Same reasoning as before: two AZs for resilience, one NAT Gateway to control cost (~$30/month saved vs two), private subnets for worker nodes.

---

## Step 5 — EKS cluster (with OIDC enabled for IRSA)

`terraform/eks.tf`:

```hcl
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "19.0.0"

  cluster_name    = "${var.project_name}-cluster"
  cluster_version = "1.28"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true

  enable_irsa = true

  eks_managed_node_groups = {
    main = {
      min_size       = 1
      max_size       = 3
      desired_size   = 2
      instance_types = ["t3.medium"]

      labels = {
        Environment = var.environment
      }
    }
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}
```

The only new line vs the original guide is `enable_irsa = true` — this tells the module to set up the OIDC identity provider for the cluster, which is the prerequisite for IRSA roles.

`cluster_endpoint_public_access = true` — flagged here deliberately. For this lab, the EKS API endpoint is reachable from the internet (still protected by IAM auth). In production you'd typically restrict this to a VPN or bastion host. Note this in `DECISIONS.md` — it's a common interview question.

---

## Step 6 — IRSA role for the backend pod (Secrets Manager access)

`terraform/irsa.tf`:

```hcl
data "aws_iam_policy_document" "secrets_manager_read" {
  statement {
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/*"
    ]
  }
}

resource "aws_iam_policy" "secrets_manager_read" {
  name   = "${var.project_name}-secrets-read"
  policy = data.aws_iam_policy_document.secrets_manager_read.json
}

module "backend_irsa_role" {
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.30.0"

  role_name = "${var.project_name}-backend-irsa"

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["devops-project:backend-sa"]
    }
  }
}

resource "aws_iam_role_policy_attachment" "backend_secrets" {
  role       = module.backend_irsa_role.iam_role_name
  policy_arn = aws_iam_policy.secrets_manager_read.arn
}
```

**What this creates and why it matters:**

- A policy that allows reading only secrets under the path `my-devops-project/*` — least privilege, not blanket Secrets Manager access.
- An IAM role whose trust policy says "only the `backend-sa` ServiceAccount in the `devops-project` namespace can assume this role" — `namespace_service_accounts` is the exact link between your Helm `serviceaccount.yaml` from Stage 4 and this IAM role.
- The role gets the secrets-read policy attached.

This role's ARN is what gets passed into Helm's `serviceAccount.roleArn` value in Stage 6 — closing the loop between Terraform and your chart.

---

## Step 7 — main.tf and outputs.tf

`terraform/main.tf`:

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}
```

`terraform/outputs.tf`:

```hcl
output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "backend_irsa_role_arn" {
  description = "IAM role ARN for the backend ServiceAccount"
  value       = module.backend_irsa_role.iam_role_arn
}

output "ecr_backend_url" {
  description = "ECR backend repository URL"
  value       = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${var.project_name}/backend"
}
```

You'll read `backend_irsa_role_arn` directly after `terraform apply` in Stage 6 and feed it into Helm.

---

## Step 8 — Validate

```bash
cd terraform
terraform init
terraform validate
```

---

## Stage 5 checklist

- [ ] `terraform init` completes with no errors
- [ ] `terraform validate` returns "Success!"
- [ ] No secrets hardcoded anywhere in `.tf` files
- [ ] You can explain what `enable_irsa = true` does and why it's needed
- [ ] You can explain the trust relationship in `irsa.tf` — which ServiceAccount can assume which role, and why that's least privilege
- [ ] You can explain the tradeoff of `cluster_endpoint_public_access = true`

---

---

# Stage 6 — AWS Sprint ($ starts here, 2-3 days)

## Before you run terraform apply

Create the S3 bucket and DynamoDB table for remote state:

```bash
aws s3 mb s3://my-devops-project-tfstate --region us-east-1

aws s3api put-bucket-versioning \
  --bucket my-devops-project-tfstate \
  --versioning-configuration Status=Enabled

aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Step 1 — terraform apply

```bash
cd terraform
terraform plan
```

Read the plan carefully — expect 50+ resources including the new IRSA role.

```bash
terraform apply
```

Type `yes`. Takes 15-20 minutes.

---

## Step 2 — Connect kubectl to EKS

```bash
aws eks update-kubeconfig --name my-devops-project-cluster --region us-east-1
kubectl get nodes
```

You should see 2 real EC2 nodes `Ready`.

---

## Step 3 — Create the secret in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name my-devops-project/mongo-uri \
  --description "MongoDB connection string for backend" \
  --secret-string '{"mongo-uri":"YOUR_REAL_MONGODB_CONNECTION_STRING"}' \
  --region us-east-1
```

This path (`my-devops-project/*`) matches exactly what the IAM policy in `irsa.tf` allows reading.

---

## Step 4 — Install the External Secrets Operator

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets external-secrets/external-secrets \
  -n external-secrets-system --create-namespace
```

**What this does:** installs a controller that watches for `ExternalSecret` custom resources and syncs them from AWS Secrets Manager into native Kubernetes Secrets — automatically and continuously.

---

## Step 5 — Get the IRSA role ARN and wire it into Helm

```bash
terraform output backend_irsa_role_arn
```

Copy this ARN. You'll pass it to Helm in Step 8.

---

## Step 6 — Create the SecretStore and ExternalSecret

These are new K8s resources — add them to your Helm chart:

`helm/my-devops-project/templates/secretstore.yaml`:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-store
  namespace: {{ .Values.namespace }}
spec:
  provider:
    aws:
      service: SecretsManager
      region: {{ .Values.aws.region | default "us-east-1" }}
      auth:
        jwt:
          serviceAccountRef:
            name: {{ .Values.serviceAccount.name }}
```

`helm/my-devops-project/templates/externalsecret.yaml`:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: backend-external-secret
  namespace: {{ .Values.namespace }}
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-store
    kind: SecretStore
  target:
    name: backend-secrets
    creationPolicy: Owner
  data:
    - secretKey: mongo-uri
      remoteRef:
        key: my-devops-project/mongo-uri
        property: mongo-uri
```

**The chain this completes:** the `backend-sa` ServiceAccount (annotated with the IRSA role ARN) authenticates to AWS → the `SecretStore` uses that identity to read Secrets Manager → the `ExternalSecret` syncs the value into a native K8s `Secret` named `backend-secrets` → your backend Deployment's `env.valueFrom.secretKeyRef` (already written in Stage 3/4) reads it exactly as before. No code in your app changes. No secret is ever typed into a YAML file.

---

## Step 7 — Update Kubernetes manifests for ECR images

Your `values-prod.yaml` needs the real ECR URLs:

```yaml
backend:
  image:
    repository: YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-devops-project/backend
    tag: latest
    pullPolicy: IfNotPresent
  replicaCount: 2

frontend:
  image:
    repository: YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/my-devops-project/frontend
    tag: latest
    pullPolicy: IfNotPresent
  replicaCount: 2

ingress:
  host: devops-project.local  # or your real domain if you have one

aws:
  region: us-east-1

serviceAccount:
  name: backend-sa
  roleArn: "PASTE_THE_IRSA_ROLE_ARN_FROM_STEP_5_HERE"
```

---

## Step 8 — First manual deploy (before automating via CI/CD)

```bash
helm upgrade --install my-devops-project ./helm/my-devops-project \
  -n devops-project --create-namespace \
  -f helm/my-devops-project/values.yaml \
  -f helm/my-devops-project/values-prod.yaml
```

Verify:

```bash
kubectl get all -n devops-project
kubectl get externalsecret -n devops-project
kubectl get secret backend-secrets -n devops-project -o yaml
kubectl get ingress -n devops-project
```

`kubectl get externalsecret` should show `SecretSynced` as the status. The `backend-secrets` Secret should now exist with no human having typed the MongoDB URI into kubectl or a YAML file.

---

## Step 9 — Update the CI/CD pipeline to deploy via Helm

Add this job to `.github/workflows/deploy.yml`, after `build-and-push`:

```yaml
  deploy:
    name: Deploy to EKS via Helm
    runs-on: ubuntu-latest
    needs: build-and-push
    environment: production

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Update kubeconfig
        run: |
          aws eks update-kubeconfig --name my-devops-project-cluster --region us-east-1

      - name: Set up Helm
        uses: azure/setup-helm@v4

      - name: Deploy with Helm
        run: |
          helm upgrade --install my-devops-project ./helm/my-devops-project \
            -n devops-project --create-namespace \
            -f helm/my-devops-project/values.yaml \
            -f helm/my-devops-project/values-prod.yaml \
            --set backend.image.tag=${{ github.sha }} \
            --set frontend.image.tag=${{ github.sha }}

      - name: Verify rollout
        run: |
          kubectl rollout status deployment/backend -n devops-project
          kubectl rollout status deployment/frontend -n devops-project
```

`environment: production` — go to repo → Settings → Environments → create `production` → add yourself as a required reviewer. Now every deploy pauses for manual approval before running. This is your staging→prod-style gate, implemented as a single-environment approval step (the simplified version we scoped earlier).

`--set backend.image.tag=${{ github.sha }}` — this is the payoff of the whole Helm stage: the pipeline injects the exact commit SHA as the image tag at deploy time, no file editing needed.

---

## Step 10 — Push and watch end-to-end

```bash
git add .
git commit -m "Deploy to EKS via Helm with IRSA and External Secrets"
git push
```

Actions tab → approve the `production` environment when prompted → watch build → scan → push → Helm deploy, all green.

```bash
kubectl get pods -n devops-project -w
kubectl get ingress -n devops-project
```

Open the load balancer URL — your app, live on real AWS, with secrets pulled from Secrets Manager via IRSA.

---

## Step 11 — Security validation pass (do this before recording your demo)

Run through each of these and note the result — these become screenshots and DECISIONS.md content:

```bash
# 1. Confirm the IRSA trust policy only allows your specific ServiceAccount
aws iam get-role --role-name my-devops-project-backend-irsa \
  --query 'Role.AssumeRolePolicyDocument'
# Look for: the condition restricts to system:serviceaccount:devops-project:backend-sa specifically

# 2. Confirm the pod has no static AWS credentials
kubectl exec -it -n devops-project deploy/backend -- env | grep -i aws
# Should show AWS_ROLE_ARN and AWS_WEB_IDENTITY_TOKEN_FILE (IRSA injected), NOT access keys

# 3. Confirm NetworkPolicy still holds on real EKS
kubectl run test-pod --image=busybox -n devops-project --rm -it -- sh
wget -qO- http://backend-service:80
exit
# Should still time out

# 4. Confirm non-root
kubectl exec -it -n devops-project deploy/backend -- whoami
# Should print a non-root user, not root

# 5. Confirm the ExternalSecret synced correctly
kubectl get externalsecret -n devops-project
# STATUS should be SecretSynced
```

If any of these don't behave as expected, this is the moment to debug — not after you've recorded the demo and destroyed the cluster.

---

## Step 12 — Record everything

Screen recording showing:
- GitHub Actions pipeline end to end, including the manual approval step
- `kubectl get all -n devops-project`
- The live app in the browser
- `kubectl get hpa -n devops-project`
- `kubectl get externalsecret -n devops-project` showing `SecretSynced`
- The 5 security validation checks from Step 11
- ECR console with commit-SHA-tagged images
- EKS console showing the cluster
- IAM console showing the IRSA role and its trust policy

---

## Step 13 — Destroy

```bash
cd terraform
terraform destroy
```

Type `yes`. Verify in console afterward: no EKS cluster, no NAT Gateway, nothing left running. Also delete the Secrets Manager secret if you don't need it:

```bash
aws secretsmanager delete-secret \
  --secret-id my-devops-project/mongo-uri \
  --force-delete-without-recovery \
  --region us-east-1
```

---

## Stage 6 checklist

- [ ] `terraform apply` completed with no errors
- [ ] `kubectl get nodes` shows 2 real EC2 nodes `Ready`
- [ ] ExternalSecret shows `SecretSynced`
- [ ] All 5 security validation checks from Step 11 pass
- [ ] GitHub Actions pipeline completes green, including manual approval gate
- [ ] App accessible via load balancer URL
- [ ] Screen recording saved
- [ ] `terraform destroy` completes cleanly — verified in console

---

---

# Stage 7 — Polish and documentation (free)

## Step 1 — DECISIONS.md

Write one paragraph per decision. Minimum list:

- Why EKS over ECS
- Why multi-stage Docker builds
- Why a single NAT Gateway
- Why tag images with commit SHA
- Why NetworkPolicy deny-all by default
- Why `runAsNonRoot: true`
- Why Trivy with `exit-code: 1`
- Why Helm over raw YAML — what templating buys you
- Why IRSA over static AWS credentials in pods
- Why External Secrets Operator instead of manually-created K8s Secrets
- Why `cluster_endpoint_public_access = true` for this lab, and what you'd change for production
- Why a manual approval gate before production deploy

---

## Step 2 — README.md

Include:

1. Architecture diagram (Stage 7 diagram below)
2. What the project does, 3 sentences
3. Tech stack
4. How to run locally (`docker compose up`)
5. How CI/CD works, including the approval gate
6. How to deploy (`terraform apply` + Helm)
7. Security measures — list all of them, point to DECISIONS.md for the why
8. Link to demo recording

---

## Step 3 — Clean up

- No hardcoded account IDs — confirm `values-prod.yaml` and workflow files use variables/secrets only
- No secrets in git history — `git log -p | grep -i mongo` as a sanity check
- Readable commit messages

---

## Stage 7 checklist

- [ ] DECISIONS.md covers at least 12 decisions
- [ ] README.md is clear enough for a stranger to run the project
- [ ] No secrets or account IDs hardcoded anywhere
- [ ] Demo video saved
- [ ] Repo clean and ready to share
- [ ] You can talk through every component for 10 minutes without notes

---

---

# Final architecture — how it all locks together

The diagram below shows the complete system as it exists at the end of Stage 6: GitHub Actions building and scanning images, ECR storing them, Terraform-provisioned VPC and EKS, Helm deploying the chart, IRSA connecting the backend pod's ServiceAccount to an IAM role, External Secrets pulling MongoDB credentials from Secrets Manager, and NetworkPolicy enforcing zero-trust between frontend and backend.

---

# Quick reference

```bash
# Docker
docker compose up --build
docker compose down

# Kubernetes / Helm
kubectl get all -n devops-project
kubectl get externalsecret -n devops-project
helm upgrade --install my-devops-project ./helm/my-devops-project -n devops-project -f values.yaml -f values-prod.yaml
helm template my-devops-project ./helm/my-devops-project
helm install --dry-run --debug ...

# Terraform
terraform init
terraform validate
terraform plan
terraform apply
terraform destroy

# AWS
aws eks update-kubeconfig --name my-devops-project-cluster --region us-east-1
aws secretsmanager create-secret --name my-devops-project/mongo-uri ...
aws iam get-role --role-name my-devops-project-backend-irsa
```

---

# Cost summary

| Stage | Cost |
|---|---|
| 1 — Docker | Free |
| 2 — GitHub Actions + ECR | Free |
| 3 — Kubernetes on minikube | Free |
| 4 — Helm | Free |
| 5 — Terraform (write only) | Free |
| 6 — AWS sprint (2-3 days) | ~$30-50 |
| 7 — Polish | Free |

`terraform destroy` immediately after recording. Every hour the cluster runs costs money.

---

*Good luck. This is a 9/10 junior project — if you can defend every piece of it.*
