import { expect } from "chai";
import { ethers } from "hardhat";
import { SupplyChainRegistry } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SupplyChainRegistry", function () {
  let contract: SupplyChainRegistry;
  let admin: HardhatEthersSigner;
  let manufacturer: HardhatEthersSigner;
  let distributor: HardhatEthersSigner;
  let warehouse: HardhatEthersSigner;
  let retailer: HardhatEthersSigner;
  let carrier: HardhatEthersSigner;
  let auditor: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  const testProductCode = "PROD-2026-0001";
  const testProductHash = ethers.keccak256(ethers.toUtf8Bytes("PROD-2026-0001-SERIAL-999"));
  const testShipmentCode = "SHIP-2026-0001";

  // ProductStatus Enum mapping
  const Status = {
    REGISTERED: 0,
    QUALITY_CHECKED: 1,
    READY_TO_SHIP: 2,
    SHIPPED: 3,
    IN_TRANSIT: 4,
    RECEIVED: 5,
    STORED: 6,
    SOLD: 7,
    RECALLED: 8,
  };

  beforeEach(async function () {
    [
      admin,
      manufacturer,
      distributor,
      warehouse,
      retailer,
      carrier,
      auditor,
      unauthorized,
    ] = await ethers.getSigners();

    const factory = await ethers.getContractFactory("SupplyChainRegistry");
    contract = await factory.deploy(admin.address);
    await contract.waitForDeployment();

    // Grant roles
    const MANUFACTURER_ROLE = await contract.MANUFACTURER_ROLE();
    const DISTRIBUTOR_ROLE = await contract.DISTRIBUTOR_ROLE();
    const WAREHOUSE_ROLE = await contract.WAREHOUSE_ROLE();
    const RETAILER_ROLE = await contract.RETAILER_ROLE();
    const LOGISTICS_ROLE = await contract.LOGISTICS_ROLE();
    const AUDITOR_ROLE = await contract.AUDITOR_ROLE();

    await contract.connect(admin).grantRole(MANUFACTURER_ROLE, manufacturer.address);
    await contract.connect(admin).grantRole(DISTRIBUTOR_ROLE, distributor.address);
    await contract.connect(admin).grantRole(WAREHOUSE_ROLE, warehouse.address);
    await contract.connect(admin).grantRole(RETAILER_ROLE, retailer.address);
    await contract.connect(admin).grantRole(LOGISTICS_ROLE, carrier.address);
    await contract.connect(admin).grantRole(AUDITOR_ROLE, auditor.address);
  });

  describe("Deployment & Access Control", function () {
    it("should set deployer/admin with default roles", async function () {
      const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
      expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("should correctly assign roles to designated accounts", async function () {
      const MANUFACTURER_ROLE = await contract.MANUFACTURER_ROLE();
      const AUDITOR_ROLE = await contract.AUDITOR_ROLE();
      expect(await contract.hasRole(MANUFACTURER_ROLE, manufacturer.address)).to.be.true;
      expect(await contract.hasRole(AUDITOR_ROLE, auditor.address)).to.be.true;
      expect(await contract.hasRole(MANUFACTURER_ROLE, unauthorized.address)).to.be.false;
    });
  });

  describe("Product Registration", function () {
    it("should allow authorized manufacturer to register product and emit ProductRegistered", async function () {
      const tx = await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      const receipt = await tx.wait();

      expect(tx).to.emit(contract, "ProductRegistered").withArgs(
        1,
        testProductCode,
        testProductHash,
        manufacturer.address,
        (await ethers.provider.getBlock(receipt!.blockNumber))!.timestamp
      );

      const product = await contract.getProduct(1);
      expect(product.productId).to.equal(1);
      expect(product.productCode).to.equal(testProductCode);
      expect(product.productHash).to.equal(testProductHash);
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.status).to.equal(Status.REGISTERED);
    });

    it("should reject registration by unauthorized accounts", async function () {
      await expect(
        contract.connect(unauthorized).registerProduct(testProductCode, testProductHash)
      ).to.be.revertedWith("UNAUTHORIZED_ACTION");
    });

    it("should reject empty productCode or zero hash", async function () {
      await expect(
        contract.connect(manufacturer).registerProduct("", testProductHash)
      ).to.be.revertedWith("INVALID_PRODUCT_CODE");

      await expect(
        contract.connect(manufacturer).registerProduct("PROD-TEST", ethers.ZeroHash)
      ).to.be.revertedWith("INVALID_HASH");
    });

    it("should reject duplicate product codes", async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      await expect(
        contract.connect(manufacturer).registerProduct(testProductCode, testProductHash)
      ).to.be.revertedWith("PRODUCT_ALREADY_EXISTS");
    });

    it("should fetch product by productCode", async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      const product = await contract.getProductByCode(testProductCode);
      expect(product.productId).to.equal(1);
      expect(product.productCode).to.equal(testProductCode);
    });
  });

  describe("Quality Check", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
    });

    it("should allow auditor to record passed quality check and transition to QUALITY_CHECKED", async function () {
      const tx = await contract.connect(auditor).recordQualityCheck(1, true, "All ISO tests passed");
      await expect(tx).to.emit(contract, "QualityChecked").withArgs(
        1,
        auditor.address,
        true,
        "All ISO tests passed",
        (await ethers.provider.getBlock((await tx.wait())!.blockNumber))!.timestamp
      );

      const product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.QUALITY_CHECKED);

      const checks = await contract.getQualityChecks(1);
      expect(checks.length).to.equal(1);
      expect(checks[0].passed).to.be.true;
      expect(checks[0].notes).to.equal("All ISO tests passed");
    });

    it("should recall product when quality check fails", async function () {
      const tx = await contract.connect(auditor).recordQualityCheck(1, false, "Contamination detected");
      await expect(tx).to.emit(contract, "ProductRecalled");

      const product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.RECALLED);
    });

    it("should reject quality check from unauthorized party", async function () {
      await expect(
        contract.connect(unauthorized).recordQualityCheck(1, true, "Pass")
      ).to.be.revertedWith("UNAUTHORIZED_ACTION");
    });

    it("should reject quality check for non-existent product", async function () {
      await expect(
        contract.connect(auditor).recordQualityCheck(999, true, "Pass")
      ).to.be.revertedWith("PRODUCT_NOT_FOUND");
    });
  });

  describe("Shipment Lifecycle & Ownership Transfer", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      await contract.connect(auditor).recordQualityCheck(1, true, "Pass");
    });

    it("should create shipment, ship, update in-transit, and receive with automatic ownership transfer", async function () {
      // 1. Create shipment (Manufacturer -> Distributor via Carrier)
      const txCreate = await contract.connect(manufacturer).createShipment(
        testShipmentCode,
        1,
        distributor.address,
        carrier.address
      );
      await expect(txCreate).to.emit(contract, "ShipmentCreated");

      let product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.READY_TO_SHIP);

      let shipment = await contract.getShipment(1);
      expect(shipment.shipmentCode).to.equal(testShipmentCode);
      expect(shipment.sender).to.equal(manufacturer.address);
      expect(shipment.receiver).to.equal(distributor.address);
      expect(shipment.carrier).to.equal(carrier.address);

      // 2. Ship product (Dispatched by Carrier)
      const txShip = await contract.connect(carrier).shipProduct(1, 1);
      await expect(txShip).to.emit(contract, "ProductShipped");

      product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.SHIPPED);

      // 3. Mark in-transit
      const txTransit = await contract.connect(carrier).markInTransit(1, 1);
      await expect(txTransit).to.emit(contract, "ShipmentInTransit");

      product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.IN_TRANSIT);

      // 4. Receive product by receiver (Distributor)
      const txReceive = await contract.connect(distributor).receiveProduct(1, 1);
      await expect(txReceive).to.emit(contract, "ProductReceived");
      await expect(txReceive).to.emit(contract, "OwnershipTransferred").withArgs(
        1,
        manufacturer.address,
        distributor.address,
        (await ethers.provider.getBlock((await txReceive.wait())!.blockNumber))!.timestamp
      );

      product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.RECEIVED);
      expect(product.currentOwner).to.equal(distributor.address);
    });

    it("should reject shipment creation if not current owner", async function () {
      await expect(
        contract.connect(unauthorized).createShipment(
          testShipmentCode,
          1,
          distributor.address,
          carrier.address
        )
      ).to.be.revertedWith("NOT_CURRENT_OWNER");
    });

    it("should reject shipment to zero address or self", async function () {
      await expect(
        contract.connect(manufacturer).createShipment(
          testShipmentCode,
          1,
          ethers.ZeroAddress,
          carrier.address
        )
      ).to.be.revertedWith("INVALID_RECIPIENT");

      await expect(
        contract.connect(manufacturer).createShipment(
          testShipmentCode,
          1,
          manufacturer.address,
          carrier.address
        )
      ).to.be.revertedWith("INVALID_RECIPIENT");
    });

    it("should reject receiving by non-receiver", async function () {
      await contract.connect(manufacturer).createShipment(
        testShipmentCode,
        1,
        distributor.address,
        carrier.address
      );
      await contract.connect(carrier).shipProduct(1, 1);

      await expect(
        contract.connect(unauthorized).receiveProduct(1, 1)
      ).to.be.revertedWith("UNAUTHORIZED_ACTION");
    });

    it("should reject creating shipment if product is only REGISTERED without QC pass", async function () {
      const uninspectedCode = "PROD-UNINSPECTED-01";
      const uninspectedHash = ethers.keccak256(ethers.toUtf8Bytes(uninspectedCode));
      await contract.connect(manufacturer).registerProduct(uninspectedCode, uninspectedHash);

      await expect(
        contract.connect(manufacturer).createShipment("SHIP-INVALID", 2, distributor.address, carrier.address)
      ).to.be.revertedWith("INVALID_STATE_TRANSITION");
    });

    it("should reject receiving shipment if shipment has not been dispatched", async function () {
      await contract.connect(manufacturer).createShipment(
        testShipmentCode,
        1,
        distributor.address,
        carrier.address
      );

      // Attempting to receive before shipProduct was called
      await expect(
        contract.connect(distributor).receiveProduct(1, 1)
      ).to.be.revertedWith("INVALID_STATE_TRANSITION");
    });
  });

  describe("Warehouse Storage & Retail Sale", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      await contract.connect(auditor).recordQualityCheck(1, true, "Pass");
      await contract.connect(manufacturer).createShipment(
        testShipmentCode,
        1,
        distributor.address,
        carrier.address
      );
      await contract.connect(carrier).shipProduct(1, 1);
      await contract.connect(distributor).receiveProduct(1, 1);
    });

    it("should allow current owner to store received product", async function () {
      const tx = await contract.connect(distributor).storeProduct(1);
      await expect(tx).to.emit(contract, "ProductStored");

      const product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.STORED);
    });

    it("should allow selling stored product", async function () {
      await contract.connect(distributor).storeProduct(1);
      const tx = await contract.connect(distributor).markAsSold(1);
      await expect(tx).to.emit(contract, "ProductSold");

      const product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.SOLD);
    });

    it("should reject selling recalled or already sold product", async function () {
      await contract.connect(distributor).storeProduct(1);
      await contract.connect(distributor).markAsSold(1);

      await expect(
        contract.connect(distributor).markAsSold(1)
      ).to.be.revertedWith("INVALID_STATE_TRANSITION");
    });
  });

  describe("Manual Ownership Transfer", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
    });

    it("should allow current owner to transfer ownership explicitly", async function () {
      const tx = await contract.connect(manufacturer).transferOwnership(1, distributor.address);
      await expect(tx).to.emit(contract, "OwnershipTransferred").withArgs(
        1,
        manufacturer.address,
        distributor.address,
        (await ethers.provider.getBlock((await tx.wait())!.blockNumber))!.timestamp
      );

      const product = await contract.getProduct(1);
      expect(product.currentOwner).to.equal(distributor.address);
    });

    it("should reject transfer to self or zero address", async function () {
      await expect(
        contract.connect(manufacturer).transferOwnership(1, manufacturer.address)
      ).to.be.revertedWith("CANNOT_TRANSFER_TO_SELF");

      await expect(
        contract.connect(manufacturer).transferOwnership(1, ethers.ZeroAddress)
      ).to.be.revertedWith("INVALID_RECIPIENT");
    });
  });

  describe("Product Recall", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
    });

    it("should allow manufacturer or auditor to recall product", async function () {
      const tx = await contract.connect(auditor).recallProduct(1, "Safety violation batch #42");
      await expect(tx).to.emit(contract, "ProductRecalled").withArgs(
        1,
        auditor.address,
        "Safety violation batch #42",
        (await ethers.provider.getBlock((await tx.wait())!.blockNumber))!.timestamp
      );

      const product = await contract.getProduct(1);
      expect(product.status).to.equal(Status.RECALLED);
    });

    it("should reject subsequent operations once recalled", async function () {
      await contract.connect(auditor).recallProduct(1, "Defective batch");

      await expect(
        contract.connect(auditor).recordQualityCheck(1, true, "Pass")
      ).to.be.revertedWith("INVALID_STATE_TRANSITION");

      await expect(
        contract.connect(manufacturer).createShipment("SHIP-X", 1, distributor.address, carrier.address)
      ).to.be.revertedWith("INVALID_STATE_TRANSITION");

      await expect(
        contract.connect(auditor).recallProduct(1, "Second recall")
      ).to.be.revertedWith("ALREADY_RECALLED");
    });
  });

  describe("Product Traceability History", function () {
    it("should maintain sequential on-chain event history", async function () {
      await contract.connect(manufacturer).registerProduct(testProductCode, testProductHash);
      await contract.connect(auditor).recordQualityCheck(1, true, "Passed QC");
      await contract.connect(manufacturer).createShipment(testShipmentCode, 1, distributor.address, carrier.address);
      await contract.connect(carrier).shipProduct(1, 1);
      await contract.connect(distributor).receiveProduct(1, 1);

      const history = await contract.getProductHistory(1);
      expect(history.length).to.equal(6);
      expect(history[0].eventType).to.equal("REGISTERED");
      expect(history[1].eventType).to.equal("QUALITY_CHECKED");
      expect(history[2].eventType).to.equal("SHIPMENT_CREATED");
      expect(history[3].eventType).to.equal("SHIPPED");
      expect(history[4].eventType).to.equal("RECEIVED");
      expect(history[5].eventType).to.equal("OWNERSHIP_TRANSFERRED");
    });
  });
});
