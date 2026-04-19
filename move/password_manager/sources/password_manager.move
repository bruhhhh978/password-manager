module password_manager::password_manager {

    /// Cap cấp quyền quản lý vault cho owner
    public struct VaultCap has key {
        id: UID,
        vault_id: ID,
    }

    /// Vault lưu metadata (dữ liệu thật mã hóa trên Walrus)
    public struct Vault has key {
        id: UID,
        owner: address,
        // Walrus blob ID của dữ liệu đã mã hóa
        encrypted_blob_id: vector<u8>,
        // Seal policy ID để kiểm soát quyền giải mã
        seal_policy_id: vector<u8>,
        created_at: u64,
    }

    /// Tạo vault mới
    public fun create_vault(
        encrypted_blob_id: vector<u8>,
        seal_policy_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let vault = Vault {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            encrypted_blob_id,
            seal_policy_id,
            created_at: tx_context::epoch(ctx),
        };

        let vault_id = object::id(&vault);

        let cap = VaultCap {
            id: object::new(ctx),
            vault_id,
        };

        // Vault là shared object — ai cũng thấy nhưng chỉ owner giải mã được
        transfer::share_object(vault);
        // Cap chỉ owner giữ
        transfer::transfer(cap, tx_context::sender(ctx));
    }

    /// Cập nhật blob khi thêm/sửa/xóa mật khẩu
    public fun update_vault(
        cap: &VaultCap,
        vault: &mut Vault,
        new_blob_id: vector<u8>,
        ctx: &TxContext
    ) {
        // Kiểm tra cap đúng vault
        assert!(cap.vault_id == object::id(vault), 0);
        // Kiểm tra owner
        assert!(vault.owner == tx_context::sender(ctx), 1);
        vault.encrypted_blob_id = new_blob_id;
    }

    /// Lấy blob ID để fetch từ Walrus
    public fun get_blob_id(vault: &Vault): vector<u8> {
        vault.encrypted_blob_id
    }
}