
variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_api_token" {
  description = "Cloudflare API token from environment"
  type        = string
  sensitive   = true
}

variable "worker_name" {
  description = "Name of the Student Task Manager Worker"
  type        = string
  default     = "student-task-manager-iac"
}

variable "kv_namespace_name" {
  description = "Name of the Workers KV namespace"
  type        = string
  default     = "student-task-manager-tasks"
}

variable "workers_dev_subdomain" {
  description = "Your Cloudflare workers.dev subdomain without workers.dev"
  type        = string
  default     = "co-2023-ngdodrajka"
}
