import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;

console.log("API_KEY loaded?", API_KEY ? "YES" : "NO");

// ------------------ PROXY ------------------
app.post("/proxy", async (req, res) => {
    const { url } = req.body;

    try {
        const r = await fetch(url, {
            headers: {
                "x-api-key": API_KEY
            }
        });

        const data = await r.json();
        res.json(data);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ------------------ FRONTEND ------------------
app.get("/", (req, res) => {
res.send(`
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>OKTRU Tree Viewer</title>
<style>
 body { font-family: Arial; background:#f4f4f7; padding:20px; }
 h2 { margin-bottom:10px; }

 .layout {
    display: flex;
    gap: 30px;
 }

 /* дерево */
 .tree {
    width: 40%;
    background:white;
    padding:15px;
    border-radius:10px;
    box-shadow:0 0 8px #0002;
    max-height:85vh;
    overflow:auto;
 }
 .node { cursor:pointer; padding:4px 0; }
 .children { margin-left:20px; border-left:1px dashed #ccc; padding-left:10px; display:none; }
 .node.open + .children { display:block; }

 /* таблица */
 .table-box {
    width: 60%;
    background:white;
    padding:20px;
    border-radius:10px;
    box-shadow:0 0 8px #0002;
    max-height:85vh;
    overflow:auto;
 }
 table {
    border-collapse: collapse;
    width:100%;
    font-size:14px;
 }
 th, td {
    border:1px solid #ccc;
    padding:6px 10px;
 }
 th {
    background:#fafafa;
    text-align:left;
 }
 .err { color:red; margin-top:20px; }
</style>
</head>

<body>
<h2>OKTRU Tree Viewer</h2>

<div class="layout">
    <div id="tree" class="tree">Загрузка корневых данных...</div>
    <div id="table" class="table-box"><i>Выберите элемент слева</i></div>
</div>

<div id="error" class="err"></div>

<script>
async function fetchJSON(url) {
    try {
        const res = await fetch("/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        return res.json();
    } catch (e) {
        document.getElementById("error").innerText = "Ошибка: " + e.message;
        return [];
    }
}

function showTable(obj) {
    const table = document.getElementById("table");

    let html = "<h3>Данные объекта</h3><table>";

    for (const key in obj) {
        let value = obj[key];

        if (typeof value === "object" && value !== null) {
            value = JSON.stringify(value, null, 2);
        }

        html += \`
           <tr>
               <th>\${key}</th>
               <td><pre style="margin:0; white-space:pre-wrap;">\${value}</pre></td>
           </tr>
        \`;
    }

    html += "</table>";

    table.innerHTML = html;
}

async function createNode(item) {
    const wrap = document.createElement("div");

    const node = document.createElement("div");
    node.className = "node";
    node.textContent = item.code + " — " + (item.properties?.nameRu || "");

    node.onclick = (e) => {
        e.stopPropagation();
        showTable(item);
    };

    const childrenBox = document.createElement("div");
    childrenBox.className = "children";

    node.ondblclick = async () => {
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


// ------------------ START SERVER ------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
