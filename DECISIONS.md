1. EKS over self-managed Kubernetes
Why: EKS manages the control plane (API server, etcd) for you. In a lab project with one person, managing control plane HA manually would eat all the time. The tradeoff is cost — EKS charges per hour for the control plane.

2. Helm over raw kubectl manifests
Why: Helm lets you template values (image tags, replica counts) and deploy with one command. Without it, deploying to staging vs prod means maintaining two copies of every YAML file. The values-prod.yaml override pattern proves this.

3. IRSA over static AWS credentials
Why: Static keys (AWS_ACCESS_KEY_ID) sit in Kubernetes secrets and can be leaked. IRSA gives the pod a temporary token scoped to one IAM role. If the pod is compromised, the attacker can't use the credentials outside of that pod's identity.

4. External Secrets Operator over hardcoded secrets
Why: Secrets don't belong in git or in the Helm values file. ESO pulls them from AWS Secrets Manager at runtime. The alternative — kubectl create secret manually — breaks any automated deploy pipeline.

5. GitHub Actions with manual approval gate for production
Why: The environment: production block in the deploy job requires a human to click approve before Helm runs. This prevents an accidental push to main from immediately hitting production.

6. Trivy image scanning in CI, blocking on CRITICAL only
Why: Scanning every image before push catches known CVEs before they reach the cluster. Blocking on CRITICAL only (not HIGH) avoids the pipeline becoming permanently broken due to unfixed base image issues.

7. Images tagged with commit SHA, not latest
Why: latest is mutable — you can't tell which code is actually running. SHA tags are immutable. Every Helm deploy passes --set backend.image.tag=${{ github.sha }} so you always know exactly what's in the cluster.

8. HPA with CPU threshold at 70%, min 2 / max 5
Why: 2 replicas as minimum gives basic redundancy — one pod can die without downtime. 70% CPU trigger gives headroom to scale before the pod is actually saturated. In production I'd add memory-based scaling too.

9. NetworkPolicy with deny-all default
Why: Without a deny-all policy, every pod in the namespace can talk to every other pod by default. The deny-all base plus explicit allow rules means only frontend→backend traffic is permitted, limiting blast radius if one pod is compromised.

10. Non-root containers (UID 1000)
Why: Running as root inside a container means a container escape gives the attacker root on the node. UID 1000 limits what an attacker can do even if they break out of the app process.

11. kube-prometheus-stack over installing Prometheus and Grafana separately
Why: The stack Helm chart wires everything together — Prometheus, Grafana, AlertManager, pre-built Kubernetes dashboards — in one install. Installing them separately means manually writing ServiceMonitors and Grafana datasource configs.

12. NetworkPolicy enforcement not enabled (known gap)
Why: EKS's VPC CNI requires --enable-network-policy=true to actually enforce NetworkPolicy rules. The policies are correctly defined in the cluster but were not enforced during this lab because the addon flag requires a managed update. In production this would be enabled from day one via Terraform.

These are written in the style of honest engineering decisions — not "I did X because it's best practice" but "I did X because of this specific tradeoff." That's what makes them valuable in an interview.