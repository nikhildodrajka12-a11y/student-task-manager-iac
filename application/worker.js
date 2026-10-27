export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const headers = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers,
      });

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    try {
      // Check that the KV namespace is connected.
      if (!env.TASKS_KV) {
        return json({ error: "TASKS_KV binding is missing." }, 500);
      }

      // GET /api/tasks — retrieve all tasks.
      if (path === "/api/tasks" && method === "GET") {
        const tasks = [];
        let cursor;

        do {
          const result = await env.TASKS_KV.list({
            prefix: "task:",
            cursor,
          });

          for (const key of result.keys) {
            const task = await env.TASKS_KV.get(key.name, {
              type: "json",
            });

            if (task) tasks.push(task);
          }

          cursor = result.list_complete ? undefined : result.cursor;
        } while (cursor);

        tasks.sort((a, b) =>
          (b.createdAt || "").localeCompare(a.createdAt || "")
        );

        return json({ tasks });
      }

      // POST /api/tasks — create a task.
      if (path === "/api/tasks" && method === "POST") {
        const body = await request.json();
        const title =
          typeof body.title === "string" ? body.title.trim() : "";

        if (!title) {
          return json({ error: "Task title is required." }, 400);
        }

        const task = {
          id: crypto.randomUUID(),
          title,
          description:
            typeof body.description === "string"
              ? body.description.trim()
              : "",
          priority: ["Low", "Medium", "High"].includes(body.priority)
            ? body.priority
            : "Medium",
          status: "Pending",
          createdAt: new Date().toISOString(),
        };

        await env.TASKS_KV.put(
          `task:${task.id}`,
          JSON.stringify(task)
        );

        return json({ message: "Task created successfully.", task }, 201);
      }

      // Match routes such as /api/tasks/123.
      const match = path.match(/^\/api\/tasks\/([^/]+)$/);

      if (match) {
        const id = decodeURIComponent(match[1]);
        const key = `task:${id}`;

        // GET /api/tasks/{id} — retrieve one task.
        if (method === "GET") {
          const task = await env.TASKS_KV.get(key, {
            type: "json",
          });

          if (!task) {
            return json({ error: "Task not found." }, 404);
          }

          return json({ task });
        }

        // PUT /api/tasks/{id} — update a task.
        if (method === "PUT") {
          const existing = await env.TASKS_KV.get(key, {
            type: "json",
          });

          if (!existing) {
            return json({ error: "Task not found." }, 404);
          }

          const body = await request.json();
          const updated = { ...existing };

          if (Object.hasOwn(body, "title")) {
            if (
              typeof body.title !== "string" ||
              !body.title.trim()
            ) {
              return json({ error: "Task title cannot be empty." }, 400);
            }

            updated.title = body.title.trim();
          }

          if (Object.hasOwn(body, "description")) {
            if (typeof body.description !== "string") {
              return json({ error: "Invalid description." }, 400);
            }

            updated.description = body.description.trim();
          }

          if (Object.hasOwn(body, "priority")) {
            if (!["Low", "Medium", "High"].includes(body.priority)) {
              return json({ error: "Invalid priority." }, 400);
            }

            updated.priority = body.priority;
          }

          if (Object.hasOwn(body, "status")) {
            if (!["Pending", "In Progress", "Completed"].includes(body.status)) {
              return json({ error: "Invalid task status." }, 400);
            }

            updated.status = body.status;
          }

          updated.updatedAt = new Date().toISOString();

          await env.TASKS_KV.put(key, JSON.stringify(updated));

          return json({
            message: "Task updated successfully.",
            task: updated,
          });
        }

        // DELETE /api/tasks/{id} — delete a task.
        if (method === "DELETE") {
          const existing = await env.TASKS_KV.get(key);

          if (existing === null) {
            return json({ error: "Task not found." }, 404);
          }

          await env.TASKS_KV.delete(key);

          return json({ message: "Task deleted successfully." });
        }
      }

      return json({ error: "Route not found." }, 404);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return json({ error: "Invalid JSON request body." }, 400);
      }

      return json({ error: "Internal server error." }, 500);
    }
  },
};