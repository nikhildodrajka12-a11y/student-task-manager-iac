
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.cloudflare_account_id
  title      = var.kv_namespace_name
}

resource "cloudflare_workers_script" "app" {
  account_id  = var.cloudflare_account_id
  script_name = var.worker_name

  content_file   = "${path.module}/../application/worker.js"
  content_sha256 = filesha256("${path.module}/../application/worker.js")

  main_module        = "worker.js"
  compatibility_date = "2026-10-27"

  bindings = [{
    name         = "TASKS_KV"
    type         = "kv_namespace"
    namespace_id = cloudflare_workers_kv_namespace.tasks.id
  }]

  assets = {
    directory = "${path.module}/../application"

    config = {
      run_worker_first = ["/api/*"]
    }
  }
}
