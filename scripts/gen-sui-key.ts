import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const kp = Ed25519Keypair.generate();
console.log("SUI_SEAL_PRIVATE_KEY=" + kp.getSecretKey());
console.log("Seal address (send ~1 SUI here): " + kp.toSuiAddress());
