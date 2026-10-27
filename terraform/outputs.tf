
output "worker_name" {
  description = "Deployed Cloudflare Worker name"
  value       = cloudflare_workers_script.app.script_name
}

output "kv_namespace_id" {
  description = "Created Workers KV namespace ID"
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "application_url" {
  description = "Public application URL"
  value       = "https://${var.worker_name}.${var.workers_dev_subdomain}.workers.dev"
}
