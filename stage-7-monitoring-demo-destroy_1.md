# Stage 7 — Monitoring, Live Demo & Destroy

> Pick this up immediately after Stage 6 is complete — your app is live on EKS, Helm is deployed, IRSA and External Secrets are working.

---

## Homework before you start

**What is Prometheus?**
A tool that runs inside your cluster and scrapes metrics from every pod every few seconds — CPU, memory, request count, error rate. It stores everything as time-series data.

**What is Grafana?**
A visualization layer that connects to Prometheus and turns raw numbers into live graphs and dashboards. You open it in a browser and see your entire cluster health at a glance.

**What is kube-prometheus-stack?**
A single Helm chart that installs Prometheus + Grafana + pre-built Kubernetes dashboards all wired together. One command, everything works. This is what you will install.

Take 20 minutes reading about these before continuing.

---

## Step 1 — Install the monitoring stack

```bash
# Add the community Helm repo
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts

helm repo update

# Install everything in one shot
helm install monitoring \
  prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace
```

Wait 1-2 minutes for pods to come up, then verify:

```bash
kubectl get pods -n monitoring
```

You should see pods for Prometheus, Grafana, and AlertManager all running.

---

## Step 2 — Access Grafana

```bash
kubectl port-forward -n monitoring \
  svc/monitoring-grafana 3000:80
```

Open `http://localhost:3000` in your browser.

Login:
- Username: `admin`
- Password: `prom-operator`

You are now inside Grafana. Note in your `DECISIONS.md` that you would change this default password for anything beyond a lab environment.

---

## Step 3 — Find your dashboards

In Grafana, go to **Dashboards → Browse**.

The pre-built dashboards you care about:

| Dashboard | What it shows |
|---|---|
| Kubernetes / Compute Resources / Namespace (Pods) | CPU and memory per pod in your namespace |
| Kubernetes / Compute Resources / Cluster | Overall cluster health |
| Kubernetes / Networking / Namespace (Pods) | Network traffic between pods |

Filter the namespace dashboard to `devops-project`. You should see live CPU and memory graphs for your frontend and backend pods.

**Take a screenshot of this now** — this is one of your key demo assets.

---

## Step 4 — Live crash demo (the best part of your demo video)

This is the moment that sticks in an interviewer's memory. Do this while screen recording.

**Open two terminal windows side by side.**

Terminal 1 — watch pods in real time:
```bash
kubectl get pods -n devops-project -w
```

Terminal 2 — delete a backend pod:
```bash
kubectl delete pod -n devops-project -l app=backend
```

**What you will see:**
- Terminal 1: one pod goes `Terminating`, a new pod appears `ContainerCreating`, then `Running` — within 15-20 seconds
- Grafana: a brief dip in the CPU/memory graph for the backend, then recovery

**Why this matters for the interview:**
This proves self-healing. You are showing that Kubernetes detects the failure and recovers automatically — no human intervention needed. When you say "the system heals itself," this is the proof.

---

## Step 5 — HPA scaling demo

This shows the autoscaler working. You will generate fake CPU load and watch Kubernetes add replicas.

```bash
# Open a shell inside a pod
kubectl exec -it -n devops-project \
  $(kubectl get pod -n devops-project -l app=backend -o jsonpath='{.items[0].metadata.name}') -- sh

# Inside the pod — generate CPU load
while true; do dd if=/dev/zero of=/dev/null; done
```

In another terminal, watch the HPA react:

```bash
kubectl get hpa -n devops-project -w
```

Within 1-2 minutes you should see the replica count climb from 2 toward 5.

Kill the load (Ctrl+C inside the pod), and watch the replicas scale back down.

**Take a screenshot of the HPA showing more than 2 replicas** — this is proof the autoscaler is working.

---

## Step 6 — Security validation pass

Run through every check below and note the result. These become your demo screenshots and `DECISIONS.md` content. Do this before you record — if anything fails, now is the time to fix it.

```bash
# 1. IRSA — confirm the role trust policy is scoped to your specific ServiceAccount only
aws iam get-role \
  --role-name my-devops-project-backend-irsa \
  --query 'Role.AssumeRolePolicyDocument'
# Look for: condition restricts to system:serviceaccount:devops-project:backend-sa
# This proves least privilege — not "any pod", only this specific ServiceAccount

# 2. No static AWS credentials in the pod
kubectl exec -it -n devops-project deploy/backend -- env | grep -i aws
# Should show AWS_ROLE_ARN and AWS_WEB_IDENTITY_TOKEN_FILE (IRSA injected)
# Should NOT show AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY

# 3. NetworkPolicy still holds on real EKS
kubectl run test-pod --image=busybox -n devops-project --rm -it -- sh
wget -qO- http://backend-service:80
exit
# Should time out — NetworkPolicy blocks unlabelled pods

# 4. Non-root confirmed
kubectl exec -it -n devops-project deploy/backend -- whoami
# Should print a non-root username, not root

# 5. External Secrets synced correctly
kubectl get externalsecret -n devops-project
# STATUS column should show: SecretSynced
```

**All 5 must pass before you record your demo.**

---

## Step 7 — Record the full demo video

Screen record everything below in one continuous take if possible. This video is your permanent evidence — once you destroy the cluster, it is all you have.

**What to show, in order:**

1. GitHub Actions pipeline — show a recent run, click through each step (build, Trivy scan, push, manual approval, Helm deploy), confirm all green
2. ECR console — show your images tagged with commit SHAs
3. `kubectl get all -n devops-project` — everything running
4. Live crash demo from Step 4 — pod deletion and recovery
5. HPA scaling demo from Step 5 — replicas climbing under load
6. Grafana dashboard — CPU/memory graphs, filter to `devops-project` namespace
7. `kubectl get externalsecret -n devops-project` — showing `SecretSynced`
8. The 5 security validation checks from Step 6
9. EKS console in AWS — show the cluster, node group, worker nodes
10. VPC console — show subnets (public vs private), NAT Gateway
11. IAM console — show the IRSA role and its trust policy

**Take screenshots of everything** — even if the video covers it. Screenshots load faster when you share them.

---

## Step 8 — terraform destroy

The moment you have confirmed your recording is saved locally — destroy everything.

```bash
cd terraform
terraform destroy
```

Type `yes`. Takes 10-15 minutes.

After it finishes, verify manually in the AWS console that nothing is left running:

- [ ] No EKS cluster
- [ ] No EC2 instances (worker nodes)
- [ ] No NAT Gateway (this one is expensive per hour)
- [ ] No RDS instance (if you added one)
- [ ] No load balancer

Also clean up Secrets Manager:

```bash
aws secretsmanager delete-secret \
  --secret-id my-devops-project/mongo-uri \
  --force-delete-without-recovery \
  --region us-east-1
```

---

## Stage 7 checklist — confirm all before closing the project

- [ ] Prometheus + Grafana installed and pods running in `monitoring` namespace
- [ ] Grafana dashboard shows live CPU/memory for your pods
- [ ] Live crash demo recorded — pod deleted and recovered on camera
- [ ] HPA scaling demo recorded — replicas climbed under load
- [ ] All 5 security validation checks passed
- [ ] Full demo video saved locally (confirm you can play it back)
- [ ] Screenshots saved and organized by stage
- [ ] `terraform destroy` completed cleanly
- [ ] Verified in AWS console — no resources left running
- [ ] Secrets Manager secret deleted

---

## What to do next — Stage 8 (Polish)

Once everything above is done and the cluster is destroyed, move to the polish stage:

**DECISIONS.md** — at least 12 decisions, each with one honest paragraph explaining the why. Include a note on monitoring: why `kube-prometheus-stack` over installing Prometheus and Grafana separately, and what alerting rules you would add for a real production system.

**README.md** — add the link to your demo video, add the architecture diagram, confirm all commands in the "how to deploy" section still work.

**GitHub repo cleanup** — no hardcoded account IDs, no secrets in git history, readable commit messages.

**The final test** — close everything and explain the entire project out loud, from Docker to destroy, without looking at notes. Where you get stuck is exactly where you need one more pass of understanding before sharing the repo publicly.

---

*When you can talk through the whole thing for 10 minutes without notes — the project is done.*
