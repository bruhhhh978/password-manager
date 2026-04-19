import { SealClient } from "@mysten/seal";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";

const suiClient = new SuiClient({ 
  url: getFullnodeUrl("testnet"),
});

const sealClient = new SealClient({ suiClient });

export interface PasswordEntry {
    id: string;
    site: string;
    username: string;
    password: string;
}

// Mã hóa danh sách mật khẩu
export async function encryptPasswords(
    passwords: PasswordEntry[],
    policyId: string
): Promise<Uint8Array> {
    const data = new TextEncoder().encode(JSON.stringify(passwords));

    const encrypted = await sealClient.encrypt({
        data,
        policyObjectId: policyId,
    });

    return encrypted;
}

// Giải mã
export async function decryptPasswords(
    encryptedData: Uint8Array,
    txBytes: Uint8Array
): Promise<PasswordEntry[]> {

    const decrypted = await sealClient.decrypt({
        data: encryptedData,
        txBytes,
    });

    return JSON.parse(new TextDecoder().decode(decrypted));
}