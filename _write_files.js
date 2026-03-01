const fs = require("fs");
const base = "C:/Users/dbatc/Downloads/data-structure-migration/components/";
fs.mkdirSync(base + "sales", { recursive: true });
fs.mkdirSync(base + "finances", { recursive: true });
fs.mkdirSync(base + "management", { recursive: true });
console.log("dirs ready");