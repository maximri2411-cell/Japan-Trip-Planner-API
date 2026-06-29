variable "aws_region" { # The place where everthing gets deployed
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" { # The name of my project
  description = "Name prefix for all resources"
  type        = string
  default     = "my-devops-project"
}

variable "environment" { # Will be used in tags and node group table, dosent change resoure behavior, just lables them for id and cost tracking
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" { # The IP range 
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}