# PART 1 Define the IAM Policy Document (In-memory structural definition)
data "aws_iam_policy_document" "secrets_manager_read" {
  statement {
    # Grant permission (Allow access)
    effect = "Allow"

    # Specify the exact API actions allowed for AWS Secrets Manager
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret"
    ]

    # Enforce strict security (Least Privilege) by restricting access 
    # ONLY to secrets prefixed with this specific project name within the region
    resources = [
      "arn:aws:secretsmanager:${var.aws_region}:*:secret:${var.project_name}/*"
    ]
  }
}

# PART 2 Create the Actual IAM Policy in AWS
resource "aws_iam_policy" "secrets_manager_read" {
  # The name of the policy as it will appear in the AWS IAM Console
  name   = "${var.project_name}-secrets-read"
  
  # Convert the HCL policy document from Part 1 into the standard JSON format required by AWS
  policy = data.aws_iam_policy_document.secrets_manager_read.json
}


# PART 3 Create the IAM Role for EKS Service Accounts (IRSA Bridge)
module "backend_irsa_role" {
  # Using the official AWS community module for managing EKS-integrated IAM roles
  source  = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"
  version = "5.30.0"

  # The name of the IAM Role created in AWS
  role_name = "${var.project_name}-backend-irsa"

  # CRITICAL: Configure the OIDC Trust Relationship (Trust Policy)
  oidc_providers = {
    main = {
      # Points directly to the OIDC provider generated during EKS cluster creation
      provider_arn               = module.eks.oidc_provider_arn
      
      # Strict Gatekeeper Rule: ONLY a Pod bound to the 'backend-sa' ServiceAccount
      # inside the 'devops-project' Namespace is authorized to assume this role!
      namespace_service_accounts = ["devops-project:backend-sa"]
    }
  }
}

# PART 4: Attach the IAM Policy to the IRSA Role (The Link)
resource "aws_iam_role_policy_attachment" "backend_secrets" {
  # References the backend IAM Role created by the module in Part 3
  role       = module.backend_irsa_role.iam_role_name
  
  # References the standard ARN (address) of the custom policy created in Part 2
  policy_arn = aws_iam_policy.secrets_manager_read.arn
}