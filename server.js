import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY; // <-- ключ берём из ENV

if (!API_KEY) {
    console.error("❌ ERROR: API_KEY not set in Render env variables");
}

// --- Прокси запросов ---
app.post("/proxy", async (req, res) => {
    const { url } = req.body;

    try {
        const r = await fetch(url, {
            headers: {
                Authorization: API_KEY  // <-- ключ напрямую из ENV
            }
        });

        const data = await r.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Фронтенд (один HTML-файл) ---
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
</style>
</head>
<body>
<h2>OKTRU Tree Viewer</h2>

<div id="tree">Загрузка...</div>

<script>
async function fetchJSON(url) {
    const res = await fetch("/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
    });
    return res.json();
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
    treeEl.innerHTML = "<b>Загрузка корневых данных...</b>";

    const roots = await fetchJSON(
        "https://nationalcatalog.kz/gwp/portal/api/v1/dictionaries/oktru/roots"
    );

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
