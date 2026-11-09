import { sweep } from "@/server/sweep";
console.log(new Date().toISOString(), await sweep(50));
