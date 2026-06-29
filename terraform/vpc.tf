module "vpc" {
  source  = "terraform-aws-modules/vpc/aws" # The official community module by AWS
  version = "5.0.0" # Always pick the exact version you want 

  name = "${var.project_name}-vpc" # Name from variables 
  cidr = var.vpc_cidr

  azs             = ["${var.aws_region}a", "${var.aws_region}b"] # The Region + AZ we want the to be lunch in 
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"] # Creates 2 Private subnets
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"] # Creates 2 Public subnets

  enable_nat_gateway   = true # Creating 1 NAT for the private nodes 
  single_nat_gateway   = true 
  enable_dns_hostnames = true # Must be true together for R53 to resolve DNS names in VPC
  enable_dns_support   = true

  tags = {
    Project     = var.project_name # Metadata
    Environment = var.environment
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1" # Put internet-facing Load Balancers here
  }

# Both are for K8 so the controller will know where to find them, without them, the creation will fail

  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1" # Put internal Load Balancers here
  }
}