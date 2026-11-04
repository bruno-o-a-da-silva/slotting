// Browser entry: fetch the JSON the CLI wrote and mount the editor. Not unit tested; the
// logic lives in src/editor.ts, which is.
import { mount } from "../src/editor.js";
import type { MapData } from "../src/report.js";

const root = document.getElementById("app") as HTMLElement;
const res = await fetch("./data.json");
if (res.ok) mount(root, (await res.json()) as MapData);
