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