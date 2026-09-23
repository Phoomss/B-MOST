// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title SupplyChainRegistry
 * @dev Smart contract for multi-organization supply-chain traceability platform (B-MOST).
 * Enforces access control, valid state transitions, immutability, and complete auditable event history.
 */
contract SupplyChainRegistry is AccessControl {
    // ----------------------------------------------------
    // Roles
    // ----------------------------------------------------
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant WAREHOUSE_ROLE = keccak256("WAREHOUSE_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant LOGISTICS_ROLE = keccak256("LOGISTICS_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");

    // ----------------------------------------------------
    // Enums
    // ----------------------------------------------------
    enum ProductStatus {
        REGISTERED,       // 0
        QUALITY_CHECKED,  // 1
        READY_TO_SHIP,    // 2
        SHIPPED,          // 3
        IN_TRANSIT,       // 4
        RECEIVED,         // 5
        STORED,           // 6
        SOLD,             // 7
        RECALLED          // 8
    }

    enum ShipmentStatus {
        PENDING,          // 0
        SHIPPED,          // 1
        IN_TRANSIT,       // 2
        DELIVERED,        // 3
        CANCELLED         // 4
    }

    // ----------------------------------------------------
    // Structs
    // ----------------------------------------------------
    struct Product {
        uint256 productId;
        string productCode;
        bytes32 productHash;
        address manufacturer;
        address currentOwner;
        ProductStatus status;
        uint256 registeredAt;
    }

    struct QualityCheck {
        uint256 checkId;
        uint256 productId;
        address inspector;
        bool passed;
        string notes;
        uint256 checkedAt;
    }

    struct Shipment {
        uint256 shipmentId;
        string shipmentCode;
        uint256 productId;
        address sender;
        address receiver;
        address carrier;
        ShipmentStatus status;
        uint256 createdAt;
        uint256 shippedAt;
        uint256 receivedAt;
    }

    struct ProductEventRecord {
        string eventType;
        address actor;
        uint256 timestamp;
        string details;
    }

    // ----------------------------------------------------
    // State Variables
    // ----------------------------------------------------
    uint256 private _productCounter;
    uint256 private _shipmentCounter;
    uint256 private _qualityCheckCounter;

    // productId => Product
    mapping(uint256 => Product) private _products;

    // productCode => productId
    mapping(string => uint256) private _productCodeToId;

    // shipmentId => Shipment
    mapping(uint256 => Shipment) private _shipments;

    // shipmentCode => shipmentId
    mapping(string => uint256) private _shipmentCodeToId;

    // productId => QualityCheck[]
    mapping(uint256 => QualityCheck[]) private _productQualityChecks;

    // productId => ProductEventRecord[]
    mapping(uint256 => ProductEventRecord[]) private _productHistory;

    // ----------------------------------------------------
    // Events
    // ----------------------------------------------------
    event ProductRegistered(
        uint256 indexed productId,
        string productCode,
        bytes32 productHash,
        address indexed manufacturer,
        uint256 timestamp
    );

    event QualityChecked(
        uint256 indexed productId,
        address indexed inspector,
        bool passed,
        string notes,
        uint256 timestamp
    );

    event ShipmentCreated(
        uint256 indexed shipmentId,
        string shipmentCode,
        uint256 indexed productId,
        address indexed sender,
        address receiver,
        address carrier,
        uint256 timestamp
    );

    event ProductShipped(
        uint256 indexed productId,
        uint256 indexed shipmentId,
        address indexed sender,
        uint256 timestamp
    );

    event ShipmentInTransit(
        uint256 indexed productId,
        uint256 indexed shipmentId,
        address indexed carrier,
        uint256 timestamp
    );

    event ProductReceived(
        uint256 indexed productId,
        uint256 indexed shipmentId,
        address indexed receiver,
        uint256 timestamp
    );

    event ProductStored(
        uint256 indexed productId,
        address indexed owner,
        uint256 timestamp
    );

    event OwnershipTransferred(
        uint256 indexed productId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 timestamp
    );

    event ProductSold(
        uint256 indexed productId,
        address indexed seller,
        uint256 timestamp
    );

    event ProductRecalled(
        uint256 indexed productId,
        address indexed recalledBy,
        string reason,
        uint256 timestamp
    );

    // ----------------------------------------------------
    // Modifiers
    // ----------------------------------------------------
    modifier productExists(uint256 productId) {
        require(_products[productId].productId != 0, "PRODUCT_NOT_FOUND");
        _;
    }

    modifier onlyProductOwner(uint256 productId) {
        require(_products[productId].productId != 0, "PRODUCT_NOT_FOUND");
        require(_products[productId].currentOwner == msg.sender, "NOT_CURRENT_OWNER");
        _;
    }

    // ----------------------------------------------------
    // Constructor
    // ----------------------------------------------------
    constructor(address initialAdmin) {
        address admin = initialAdmin == address(0) ? msg.sender : initialAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MANUFACTURER_ROLE, admin);
        _grantRole(DISTRIBUTOR_ROLE, admin);
        _grantRole(WAREHOUSE_ROLE, admin);
        _grantRole(RETAILER_ROLE, admin);
        _grantRole(LOGISTICS_ROLE, admin);
        _grantRole(AUDITOR_ROLE, admin);
    }

    // ----------------------------------------------------
    // Product Registration
    // ----------------------------------------------------
    /**
     * @notice Registers a new product on-chain.
     * @dev Caller must have MANUFACTURER_ROLE. Product code must be unique.
     */
    function registerProduct(
        string calldata productCode,
        bytes32 productHash
    ) external returns (uint256) {
        require(hasRole(MANUFACTURER_ROLE, msg.sender), "UNAUTHORIZED_ACTION");
        require(bytes(productCode).length > 0, "INVALID_PRODUCT_CODE");
        require(productHash != bytes32(0), "INVALID_HASH");
        require(_productCodeToId[productCode] == 0, "PRODUCT_ALREADY_EXISTS");

        _productCounter++;
        uint256 newProductId = _productCounter;

        Product memory newProduct = Product({
            productId: newProductId,
            productCode: productCode,
            productHash: productHash,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            status: ProductStatus.REGISTERED,
            registeredAt: block.timestamp
        });

        _products[newProductId] = newProduct;
        _productCodeToId[productCode] = newProductId;

        _recordHistory(newProductId, "REGISTERED", msg.sender, "Product registered by manufacturer");

        emit ProductRegistered(
            newProductId,
            productCode,
            productHash,
            msg.sender,
            block.timestamp
        );

        return newProductId;
    }

    // ----------------------------------------------------
    // Quality Control
    // ----------------------------------------------------
    /**
     * @notice Records quality inspection for a product.
     * @dev Caller must have AUDITOR_ROLE or MANUFACTURER_ROLE or be current owner.
     */
    function recordQualityCheck(
        uint256 productId,
        bool passed,
        string calldata notes
    ) external productExists(productId) {
        Product storage product = _products[productId];

        require(
            hasRole(AUDITOR_ROLE, msg.sender) ||
            hasRole(MANUFACTURER_ROLE, msg.sender) ||
            product.currentOwner == msg.sender,
            "UNAUTHORIZED_ACTION"
        );

        require(product.status != ProductStatus.RECALLED, "INVALID_STATE_TRANSITION");
        require(product.status != ProductStatus.SOLD, "INVALID_STATE_TRANSITION");

        _qualityCheckCounter++;
        QualityCheck memory check = QualityCheck({
            checkId: _qualityCheckCounter,
            productId: productId,
            inspector: msg.sender,
            passed: passed,
            notes: notes,
            checkedAt: block.timestamp
        });

        _productQualityChecks[productId].push(check);

        if (passed) {
            product.status = ProductStatus.QUALITY_CHECKED;
            _recordHistory(productId, "QUALITY_CHECKED", msg.sender, notes);
        } else {
            product.status = ProductStatus.RECALLED;
            _recordHistory(productId, "RECALLED", msg.sender, string.concat("Failed QC: ", notes));
            emit ProductRecalled(productId, msg.sender, notes, block.timestamp);
        }

        emit QualityChecked(
            productId,
            msg.sender,
            passed,
            notes,
            block.timestamp
        );
    }

    // ----------------------------------------------------
    // Shipment & Logistics
    // ----------------------------------------------------
    /**
     * @notice Creates a shipment reference and prepares product for shipping.
     */
    function createShipment(
        string calldata shipmentCode,
        uint256 productId,
        address receiver,
        address carrier
    ) external productExists(productId) returns (uint256) {
        Product storage product = _products[productId];

        require(product.currentOwner == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "NOT_CURRENT_OWNER");
        require(bytes(shipmentCode).length > 0, "INVALID_SHIPMENT_CODE");
        require(_shipmentCodeToId[shipmentCode] == 0, "SHIPMENT_ALREADY_EXISTS");
        require(receiver != address(0) && receiver != msg.sender, "INVALID_RECIPIENT");

        // Valid statuses to ship from: QUALITY_CHECKED, STORED, or already READY_TO_SHIP
        require(
            product.status == ProductStatus.QUALITY_CHECKED ||
            product.status == ProductStatus.STORED ||
            product.status == ProductStatus.READY_TO_SHIP,
            "INVALID_STATE_TRANSITION"
        );

        _shipmentCounter++;
        uint256 newShipmentId = _shipmentCounter;

        Shipment memory newShipment = Shipment({
            shipmentId: newShipmentId,
            shipmentCode: shipmentCode,
            productId: productId,
            sender: msg.sender,
            receiver: receiver,
            carrier: carrier,
            status: ShipmentStatus.PENDING,
            createdAt: block.timestamp,
            shippedAt: 0,
            receivedAt: 0
        });

        _shipments[newShipmentId] = newShipment;
        _shipmentCodeToId[shipmentCode] = newShipmentId;

        product.status = ProductStatus.READY_TO_SHIP;

        _recordHistory(productId, "SHIPMENT_CREATED", msg.sender, shipmentCode);

        emit ShipmentCreated(
            newShipmentId,
            shipmentCode,
            productId,
            msg.sender,
            receiver,
            carrier,
            block.timestamp
        );

        return newShipmentId;
    }

    /**
     * @notice Dispatches product for shipping.
     */
    function shipProduct(
        uint256 productId,
        uint256 shipmentId
    ) external productExists(productId) {
        Shipment storage shipment = _shipments[shipmentId];
        require(shipment.shipmentId != 0, "SHIPMENT_NOT_FOUND");
        require(shipment.productId == productId, "SHIPMENT_PRODUCT_MISMATCH");

        Product storage product = _products[productId];

        require(
            msg.sender == product.currentOwner ||
            msg.sender == shipment.carrier ||
            hasRole(LOGISTICS_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "UNAUTHORIZED_ACTION"
        );

        require(
            product.status == ProductStatus.READY_TO_SHIP ||
            product.status == ProductStatus.QUALITY_CHECKED ||
            product.status == ProductStatus.STORED,
            "INVALID_STATE_TRANSITION"
        );

        product.status = ProductStatus.SHIPPED;
        shipment.status = ShipmentStatus.SHIPPED;
        shipment.shippedAt = block.timestamp;

        _recordHistory(productId, "SHIPPED", msg.sender, shipment.shipmentCode);

        emit ProductShipped(productId, shipmentId, msg.sender, block.timestamp);
    }

    /**
     * @notice Updates shipment state to IN_TRANSIT.
     */
    function markInTransit(
        uint256 productId,
        uint256 shipmentId
    ) external productExists(productId) {
        Shipment storage shipment = _shipments[shipmentId];
        require(shipment.shipmentId != 0, "SHIPMENT_NOT_FOUND");
        require(shipment.productId == productId, "SHIPMENT_PRODUCT_MISMATCH");

        Product storage product = _products[productId];

        require(
            msg.sender == shipment.carrier ||
            msg.sender == product.currentOwner ||
            hasRole(LOGISTICS_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "UNAUTHORIZED_ACTION"
        );

        require(product.status == ProductStatus.SHIPPED, "INVALID_STATE_TRANSITION");

        product.status = ProductStatus.IN_TRANSIT;
        shipment.status = ShipmentStatus.IN_TRANSIT;

        _recordHistory(productId, "IN_TRANSIT", msg.sender, shipment.shipmentCode);

        emit ShipmentInTransit(productId, shipmentId, msg.sender, block.timestamp);
    }

    /**
     * @notice Confirms receipt of shipment and automatically transfers ownership to recipient.
     */
    function receiveProduct(
        uint256 productId,
        uint256 shipmentId
    ) external productExists(productId) {
        Shipment storage shipment = _shipments[shipmentId];
        require(shipment.shipmentId != 0, "SHIPMENT_NOT_FOUND");
        require(shipment.productId == productId, "SHIPMENT_PRODUCT_MISMATCH");

        require(
            msg.sender == shipment.receiver || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "UNAUTHORIZED_ACTION"
        );

        Product storage product = _products[productId];

        require(
            product.status == ProductStatus.SHIPPED ||
            product.status == ProductStatus.IN_TRANSIT,
            "INVALID_STATE_TRANSITION"
        );

        address previousOwner = product.currentOwner;
        address newOwner = shipment.receiver;

        product.status = ProductStatus.RECEIVED;
        product.currentOwner = newOwner;

        shipment.status = ShipmentStatus.DELIVERED;
        shipment.receivedAt = block.timestamp;

        _recordHistory(productId, "RECEIVED", newOwner, shipment.shipmentCode);
        _recordHistory(productId, "OWNERSHIP_TRANSFERRED", newOwner, "Ownership transferred on receipt");

        emit ProductReceived(productId, shipmentId, newOwner, block.timestamp);
        emit OwnershipTransferred(productId, previousOwner, newOwner, block.timestamp);
    }

    // ----------------------------------------------------
    // Storage & Warehousing
    // ----------------------------------------------------
    /**
     * @notice Places received product into warehouse storage.
     */
    function storeProduct(uint256 productId) external onlyProductOwner(productId) {
        Product storage product = _products[productId];

        require(product.status == ProductStatus.RECEIVED, "INVALID_STATE_TRANSITION");

        product.status = ProductStatus.STORED;

        _recordHistory(productId, "STORED", msg.sender, "Product placed in storage");

        emit ProductStored(productId, msg.sender, block.timestamp);
    }

    // ----------------------------------------------------
    // Ownership Transfer
    // ----------------------------------------------------
    /**
     * @notice Explicitly transfers ownership to a new organization address.
     */
    function transferOwnership(
        uint256 productId,
        address newOwner
    ) external onlyProductOwner(productId) {
        require(newOwner != address(0), "INVALID_RECIPIENT");
        require(newOwner != msg.sender, "CANNOT_TRANSFER_TO_SELF");

        Product storage product = _products[productId];
        require(product.status != ProductStatus.RECALLED, "INVALID_STATE_TRANSITION");
        require(product.status != ProductStatus.SOLD, "INVALID_STATE_TRANSITION");

        address previousOwner = product.currentOwner;
        product.currentOwner = newOwner;

        _recordHistory(productId, "OWNERSHIP_TRANSFERRED", msg.sender, "Manual ownership transfer");

        emit OwnershipTransferred(productId, previousOwner, newOwner, block.timestamp);
    }

    // ----------------------------------------------------
    // Retail & Sale
    // ----------------------------------------------------
    /**
     * @notice Marks a product as sold to the end consumer.
     */
    function markAsSold(uint256 productId) external onlyProductOwner(productId) {
        Product storage product = _products[productId];

        require(
            product.status == ProductStatus.STORED ||
            product.status == ProductStatus.RECEIVED,
            "INVALID_STATE_TRANSITION"
        );

        product.status = ProductStatus.SOLD;

        _recordHistory(productId, "SOLD", msg.sender, "Product sold to customer");

        emit ProductSold(productId, msg.sender, block.timestamp);
    }

    // ----------------------------------------------------
    // Recall
    // ----------------------------------------------------
    /**
     * @notice Recalls a product due to defect, safety or regulatory issue.
     */
    function recallProduct(
        uint256 productId,
        string calldata reason
    ) external productExists(productId) {
        Product storage product = _products[productId];

        require(
            msg.sender == product.manufacturer ||
            msg.sender == product.currentOwner ||
            hasRole(AUDITOR_ROLE, msg.sender) ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "UNAUTHORIZED_ACTION"
        );

        require(product.status != ProductStatus.RECALLED, "ALREADY_RECALLED");

        product.status = ProductStatus.RECALLED;

        _recordHistory(productId, "RECALLED", msg.sender, reason);

        emit ProductRecalled(productId, msg.sender, reason, block.timestamp);
    }

    // ----------------------------------------------------
    // View Functions
    // ----------------------------------------------------
    function getProduct(uint256 productId) external view productExists(productId) returns (Product memory) {
        return _products[productId];
    }

    function getProductByCode(string calldata productCode) external view returns (Product memory) {
        uint256 productId = _productCodeToId[productCode];
        require(productId != 0, "PRODUCT_NOT_FOUND");
        return _products[productId];
    }

    function getShipment(uint256 shipmentId) external view returns (Shipment memory) {
        require(_shipments[shipmentId].shipmentId != 0, "SHIPMENT_NOT_FOUND");
        return _shipments[shipmentId];
    }

    function getShipmentByCode(string calldata shipmentCode) external view returns (Shipment memory) {
        uint256 shipmentId = _shipmentCodeToId[shipmentCode];
        require(shipmentId != 0, "SHIPMENT_NOT_FOUND");
        return _shipments[shipmentId];
    }

    function getQualityChecks(uint256 productId) external view productExists(productId) returns (QualityCheck[] memory) {
        return _productQualityChecks[productId];
    }

    function getProductHistory(uint256 productId) external view productExists(productId) returns (ProductEventRecord[] memory) {
        return _productHistory[productId];
    }

    function getTotalProducts() external view returns (uint256) {
        return _productCounter;
    }

    function getTotalShipments() external view returns (uint256) {
        return _shipmentCounter;
    }

    // ----------------------------------------------------
    // Internal Helpers
    // ----------------------------------------------------
    function _recordHistory(
        uint256 productId,
        string memory eventType,
        address actor,
        string memory details
    ) internal {
        _productHistory[productId].push(
            ProductEventRecord({
                eventType: eventType,
                actor: actor,
                timestamp: block.timestamp,
                details: details
            })
        );
    }
}
