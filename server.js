import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

console.log("API_KEY loaded?", API_KEY ? "YES" : "NO");

// -------- PROXY --------
app.post("/proxy", async (req, res) => {
    const { url } = req.body;

    try {
        console.log("➡ Proxy request:", url);

        const r = await fetch(url, {
            headers: {
                "x-api-key": API_KEY   // <-- правильный заголовок
            }
        });

        console.log("⬅ API status:", r.status);

        const data = await r.json();
        res.json(data);

    } catch (err) {
        console.log("❌ Proxy error", err);
        res.status(500).json({ error: err.message });
    }
});

// -------- FRONTEND (HTML в одном файле) --------
app.get("/", (req, res) => {
res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>OKTRU Tree Viewer</title>
<style>
 body { font-family: Arial; background:#f4f4f7; padding:20px; }
 .tree { margin-top:20px; }
 .node { margin-left:20px; cursor:pointer; padding:4px 0; }
 .children { margin-left:20px; border-left:1px dashed #ccc; padding-left:10px; display:none; }
 .node.open + .children { display:block; }
 .err { color:red; margin-top:20px; }
</style>
</head>
<body>
<h2>OKTRU Tree Viewer</h2>

<div id="tree">Загрузка корневых данных...</div>
<div id="error" class="err"></div>

<script>
async function fetchJSON(url) {
    try {
        const res = await fetch("/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        if (!res.ok) {
            document.getElementById("error").innerText =
                "Ошибка API: " + res.status;
        }

        return res.json();
    } catch (e) {
        document.getElementById("error").innerText = "Ошибка: " + e.message;
        return [];
    }
}

async function createNode(item) {
    const wrap = document.createElement("div");

    const node = document.createElement("div");
    node.className = "node";
    node.textContent = item.code + " — " + (item.properties?.nameRu || "");

    const childrenBox = document.createElement("div");
    childrenBox.className = "children";

    node.onclick = async () => {
        if (!item.hasChild) return;

        const open = node.classList.toggle("open");

        if (open && childrenBox.childElementCount === 0) {
            childrenBox.innerHTML = "<i>Загрузка...</i>";

            const children = await fetchJSON(
                "https://nationalcatalog.kz/gwp/portal/api/v1/dictionaries/oktru/children/" + item.id
            );

            childrenBox.innerHTML = "";

            for (const ch of children) {
                childrenBox.appendChild(await createNode(ch));
            }
        }
    };

    wrap.appendChild(node);
    wrap.appendChild(childrenBox);
    return wrap;
}

(async () => {
    const treeEl = document.getElementById("tree");

    const roots = await fetchJSON(
        "https://nationalcatalog.kz/gwp/portal/api/v1/dictionaries/oktru/roots"
    );

    if (!roots || !roots.length) {
        treeEl.innerHTML = "<b style='color:red'>Нет данных. Проверь API_KEY.</b>";
        return;
    }

    treeEl.innerHTML = "";

    for (const item of roots) {
        treeEl.appendChild(await createNode(item));
    }
})();
</script>

</body>
</html>
`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
