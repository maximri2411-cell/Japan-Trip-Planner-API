🇯🇵 Beyond Tokyo | Production DevOps Platform

> A full-stack web application wrapped in production-grade DevOps infrastructure —
> containerized, automatically built and security-scanned, deployed to Kubernetes on AWS,
> provisioned entirely through code, and monitored in real time.

**The app** is a Japan trip planning tool built with Flask and MongoDB Atlas.
**The project** is everything around it.

---

## What's actually happening here

Most portfolio projects stop at "I deployed it to EC2." This one goes further.

Every `git push` to `main` triggers a pipeline that builds the Docker image, scans it for vulnerabilities, and — if it's clean — deploys it to a live Kubernetes cluster on AWS EKS via Helm. The MongoDB connection string never appears in any file. Pod-to-pod traffic is blocked by default. The infrastructure can be recreated from scratch with a single command. Grafana shows you what's happening inside the cluster in real time.

That's the project.

---

## Stack

| Layer | Technology |
|---|---|
| Application | Python / Flask, MongoDB Atlas |
| Containerization | Docker (multi-stage builds) |
| CI/CD | GitHub Actions + Trivy security scanning |
| Registry | Amazon ECR (tagged by commit SHA) |
| Orchestration | Kubernetes on AWS EKS |
| Packaging | Helm (templated chart, per-environment values) |
| Infrastructure | Terraform (VPC, EKS, IAM, IRSA) |
| Secrets | AWS Secrets Manager + External Secrets Operator |
| Monitoring | Prometheus + Grafana (kube-prometheus-stack) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GitHub Actions                                             │
│  git push → build → Trivy scan → ECR push → manual gate   │
│                                          ↓ helm upgrade     │
└─────────────────────────────────────────────────────────────┘
                                           │
┌─────────────────────── AWS VPC ──────────────────────────────┐
│                                                              │
│   Internet → ALB (public subnet)                            │
│                    │                                         │
│   ┌─────────── EKS Cluster (private subnets) ─────────────┐  │
│   │                                                        │  │
│   │  Frontend pods ──[NetworkPolicy]──► Backend pods      │  │
│   │       ↑ HPA (2–5 replicas, CPU-based)                 │  │
│   │                                                        │  │
│   │  backend-sa (ServiceAccount)                          │  │
│   │       └──IRSA──► IAM Role ──► Secrets Manager        │  │
│   │                      ↓                                │  │
│   │              backend-secrets (K8s Secret)             │  │
│   │              synced by External Secrets Operator      │  │
│   │                                                        │  │
│   │  Prometheus ──scrapes──► all pods                     │  │
│   │  Grafana    ──queries──► Prometheus                   │  │
│   └────────────────────────────────────────────────────────┘  │
│                                                              │
│   Terraform manages: VPC · EKS · IAM · IRSA · subnets      │
└─────────────────────────────────────────────────────────────┘
```

---

## Security — built in, not bolted on

Every security measure here was a deliberate decision made before writing a single line of application code. See [`DECISIONS.md`](./DECISIONS.md) for the reasoning behind each one.

**Container level**
- Multi-stage Docker builds — production image contains only what runs the app, nothing else
- Non-root user enforced inside every container (`runAsNonRoot: true` in securityContext)

**Pipeline level**
- Trivy scans every image before it reaches ECR — a critical CVE stops the pipeline cold
- Images tagged by git commit SHA — every build is traceable and rollback is a single command

**Kubernetes level**
- NetworkPolicy: deny-all by default, explicit allow rules only (frontend → backend, ingress → frontend)
- Resource limits on every pod — one pod cannot starve the entire node

**AWS level**
- IRSA (IAM Roles for Service Accounts): the backend pod assumes an IAM role scoped to read only this project's secrets — no AWS keys stored anywhere
- MongoDB connection string lives in AWS Secrets Manager, synced automatically into the cluster by the External Secrets Operator — never written into a YAML file or committed to git
- Worker nodes in private subnets — no direct internet exposure
- Manual approval gate in GitHub Actions before any production deploy

---

## Running locally

```bash
git clone https://github.com/YOUR_USERNAME/beyond-tokyo.git
cd beyond-tokyo
docker compose up --build
```

- Frontend: `http://localhost:8080`
- Backend API: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

---

## Deploying to AWS

Prerequisites: AWS CLI configured, Terraform installed, Helm installed.

```bash
# 1. Create remote state backend (one-time setup)
aws s3 mb s3://my-devops-project-tfstate --region us-east-1
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# 2. Provision infrastructure
cd terraform
terraform init
terraform apply

# 3. Connect kubectl to the real cluster
aws eks update-kubeconfig \
  --name my-devops-project-cluster \
  --region us-east-1

# 4. Store the MongoDB URI in Secrets Manager
aws secretsmanager create-secret \
  --name my-devops-project/mongo-uri \
  --secret-string '{"mongo-uri":"YOUR_MONGODB_ATLAS_URI"}'

# 5. Deploy via Helm
helm upgrade --install my-devops-project ./helm/my-devops-project \
  -n devops-project --create-namespace \
  -f helm/my-devops-project/values.yaml \
  -f helm/my-devops-project/values-prod.yaml
```

From here, every push to `main` runs the full pipeline automatically.

---

## CI/CD pipeline

```
git push → checkout → build image → Trivy scan
                                         │
                              ┌──────────┴───────────┐
                         CRITICAL CVE?            clean
                              │                    │
                           pipeline              push to ECR
                            fails             (tagged by SHA)
                                                   │
                                           manual approval
                                                   │
                                         helm upgrade --install
                                         --set image.tag=$SHA
                                                   │
                                      kubectl rollout status
```

The `--set image.tag=$SHA` flag is the key — Helm injects the exact commit SHA at deploy time, so every deployment in the cluster is traceable back to the exact commit that produced it.

---

## Monitoring

Prometheus scrapes metrics from every pod every 15 seconds. Grafana visualizes them.

```bash
# Access the Grafana dashboard
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Open http://localhost:3000
```

Dashboards available out of the box:
- Pod CPU and memory usage over time
- HPA replica count (watch it scale under load)
- Network traffic between services
- Pod restart count (your self-healing proof)

---

## Project structure

```
beyond-tokyo/
├── backend/                  # Flask API
│   ├── app.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Nginx static frontend
│   ├── index.html
│   └── Dockerfile
├── helm/
│   └── my-devops-project/    # Helm chart
│       ├── Chart.yaml
│       ├── values.yaml
│       ├── values-prod.yaml
│       └── templates/
├── terraform/                # All AWS infrastructure as code
│   ├── main.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── irsa.tf
│   └── variables.tf
├── .github/workflows/
│   └── deploy.yml            # CI/CD pipeline
├── docker-compose.yml
├── DECISIONS.md              # Why every architectural decision was made
└── README.md
```

---

## Cost

Stages 1–5 (Docker, CI/CD, K8s locally, Helm, Terraform planning) are completely free.
AWS costs begin only when `terraform apply` runs — roughly **$30–50** for a 2–3 day sprint.
`terraform destroy` stops all charges immediately.

---

## Architectural decisions

Every non-obvious decision in this project — why EKS over ECS, why a single NAT Gateway, why Trivy with `exit-code: 1`, why IRSA over static credentials, why NetworkPolicy deny-all — is documented in [`DECISIONS.md`](./DECISIONS.md).

If you're reading this as a hiring manager or senior engineer: that file is probably more interesting than this one.