import uuid
from datetime import datetime, timezone, timedelta
from app.database.session import SessionLocal, init_db, Base, engine
from app.models.facility import Hospital, BloodBank
from app.models.inventory import InventoryBatch
from app.models.donor import Donor
from app.models.request import BloodRequest
from app.models.route import Route
from app.models.event import Event
from app.models.plan import AllocationPlan, AllocationItem
from app.schemas.enums import BloodGroup, ComponentType, InventoryStatus, UrgencyLevel
from app.services.inventory.engine import InventoryReserveEngine
from app.services.logistics.engine import LogisticsEngine


def seed_database(drop_all: bool = False):
    """Populates the database with realistic synthetic facilities, inventory, donors, and routes."""
    import app.models  # noqa: F401
    if drop_all:
        Base.metadata.drop_all(bind=engine)
    init_db()
    db = SessionLocal()

    try:
        # Clear existing records
        db.query(AllocationItem).delete()
        db.query(AllocationPlan).delete()
        db.query(Event).delete()
        db.query(InventoryBatch).delete()
        db.query(Route).delete()
        db.query(Donor).delete()
        db.query(BloodRequest).delete()
        db.query(Hospital).delete()
        db.query(BloodBank).delete()
        db.commit()
        db.query(Hospital).delete()
        db.query(BloodBank).delete()
        db.commit()

        print("[Seed] Seeding Hospitals...")
        hospitals_data = [
            {
                "id": "hosp-aiims-01",
                "name": "AIIMS Apex Trauma Center",
                "code": "AIIMS-TC",
                "location": "Ring Road, Safdarjung Enclave, New Delhi",
                "trauma_level": 1,
                "latitude": 28.5672,
                "longitude": 77.2100,
                "contact_phone": "+91-11-26588500",
                "emergency_capacity": "SURGE",
                "is_active": True,
            },
            {
                "id": "hosp-safdarjung-02",
                "name": "Safdarjung Hospital Emergency",
                "code": "SJH-EMERG",
                "location": "Ring Road, New Delhi",
                "trauma_level": 1,
                "latitude": 28.5701,
                "longitude": 77.2078,
                "contact_phone": "+91-11-26165060",
                "emergency_capacity": "HIGH",
                "is_active": True,
            },
            {
                "id": "hosp-max-saket-03",
                "name": "Max Super Speciality Hospital",
                "code": "MAX-SAKET",
                "location": "1, 2 Press Enclave Marg, Saket, New Delhi",
                "trauma_level": 2,
                "latitude": 28.5284,
                "longitude": 77.2117,
                "contact_phone": "+91-11-26515050",
                "emergency_capacity": "STANDARD",
                "is_active": True,
            },
            {
                "id": "hosp-fortis-escorts-04",
                "name": "Fortis Escorts Heart Institute",
                "code": "FEHI-OKHLA",
                "location": "Okhla Road, New Delhi",
                "trauma_level": 2,
                "latitude": 28.5604,
                "longitude": 77.2801,
                "contact_phone": "+91-11-47135000",
                "emergency_capacity": "STANDARD",
                "is_active": True,
            },
            {
                "id": "hosp-apollo-05",
                "name": "Indraprastha Apollo Hospital",
                "code": "APOLLO-DEL",
                "location": "Mathura Road, Sarita Vihar, New Delhi",
                "trauma_level": 1,
                "latitude": 28.5369,
                "longitude": 77.2844,
                "contact_phone": "+91-11-26925858",
                "emergency_capacity": "HIGH",
                "is_active": True,
            },
            {
                "id": "hosp-gangaram-06",
                "name": "Sir Ganga Ram Hospital",
                "code": "SGRH-DEL",
                "location": "Old Rajinder Nagar, New Delhi",
                "trauma_level": 2,
                "latitude": 28.6387,
                "longitude": 77.1896,
                "contact_phone": "+91-11-42254000",
                "emergency_capacity": "STANDARD",
                "is_active": True,
            },
            {
                "id": "hosp-medanta-07",
                "name": "Medanta The Medicity",
                "code": "MEDANTA-GGN",
                "location": "CH Bakhtawar Singh Road, Sector 38, Gurugram",
                "trauma_level": 1,
                "latitude": 28.4391,
                "longitude": 77.0426,
                "contact_phone": "+91-124-4141414",
                "emergency_capacity": "HIGH",
                "is_active": True,
            },
        ]

        hospitals = []
        for h_data in hospitals_data:
            hosp = Hospital(**h_data)
            db.add(hosp)
            hospitals.append(hosp)
        db.commit()

        print("[Seed] Seeding Blood Banks...")
        blood_banks_data = [
            {
                "id": "bank-redcross-01",
                "name": "Indian Red Cross Society Regional Hub",
                "code": "IRCS-CENTRAL",
                "location": "1 Red Cross Road, Central Delhi",
                "is_regional_hub": True,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.6219,
                "longitude": 77.2144,
                "contact_phone": "+91-11-23716441",
            },
            {
                "id": "bank-rotary-02",
                "name": "Rotary Blood Bank Central Depot",
                "code": "ROTARY-SOUTH",
                "location": "56-57 Tuglakabad Institutional Area, New Delhi",
                "is_regional_hub": True,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.5147,
                "longitude": 77.2721,
                "contact_phone": "+91-11-29955523",
            },
            {
                "id": "bank-lions-03",
                "name": "Lions Blood Bank & Transfusion Resource",
                "code": "LIONS-WEST",
                "location": "Shivaji Marg, Moti Nagar, New Delhi",
                "is_regional_hub": False,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.6575,
                "longitude": 77.1420,
                "contact_phone": "+91-11-42258888",
            },
            {
                "id": "bank-aiims-hub-04",
                "name": "AIIMS Central Blood Depository Hub",
                "code": "AIIMS-HUB",
                "location": "Ansari Nagar, New Delhi",
                "is_regional_hub": True,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.5665,
                "longitude": 77.2110,
                "contact_phone": "+91-11-26593200",
            },
            {
                "id": "bank-gurugram-05",
                "name": "Gurugram Zonal Transfusion Center",
                "code": "GGN-ZONAL",
                "location": "Civil Lines, Sector 15, Gurugram",
                "is_regional_hub": False,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.4682,
                "longitude": 77.0328,
                "contact_phone": "+91-124-2321456",
            },
            {
                "id": "bank-noida-06",
                "name": "Noida Regional Blood Transfusion Center",
                "code": "NOIDA-REG",
                "location": "Sector 39, Noida, Uttar Pradesh",
                "is_regional_hub": False,
                "operational_status": "ONLINE",
                "is_online": True,
                "latitude": 28.5677,
                "longitude": 77.3488,
                "contact_phone": "+91-120-2575757",
            },
        ]

        blood_banks = []
        for b_data in blood_banks_data:
            bank = BloodBank(**b_data)
            db.add(bank)
            blood_banks.append(bank)
        db.commit()

        print("[Seed] Seeding Inventory Batches...")
        all_groups = [
            BloodGroup.O_POS.value,
            BloodGroup.O_NEG.value,
            BloodGroup.A_POS.value,
            BloodGroup.A_NEG.value,
            BloodGroup.B_POS.value,
            BloodGroup.B_NEG.value,
            BloodGroup.AB_POS.value,
            BloodGroup.AB_NEG.value,
        ]

        now = datetime.now(timezone.utc)

        # 1. Seed Blood Bank Inventories
        for bank in blood_banks:
            for bg in all_groups:
                # Give hubs higher stocks
                if bank.is_regional_hub:
                    if bg == BloodGroup.O_NEG.value:
                        total = 28
                        avail = 28
                    elif bg in [BloodGroup.O_POS.value, BloodGroup.A_POS.value, BloodGroup.B_POS.value]:
                        total = 65
                        avail = 62
                    else:
                        total = 35
                        avail = 33
                else:
                    if bg == BloodGroup.O_NEG.value:
                        total = 12
                        avail = 10
                    elif bg in [BloodGroup.O_POS.value, BloodGroup.A_POS.value, BloodGroup.B_POS.value]:
                        total = 38
                        avail = 35
                    else:
                        total = 18
                        avail = 16

                reserve = InventoryReserveEngine.calculate_blood_bank_safety_reserve(
                    blood_group=bg,
                    total_units=total,
                    is_regional_hub=bank.is_regional_hub,
                )

                status = InventoryReserveEngine.evaluate_inventory_status(avail, reserve).value

                batch = InventoryBatch(
                    id=str(uuid.uuid4()),
                    facility_type="BLOOD_BANK",
                    blood_bank_id=bank.id,
                    blood_group=bg,
                    component_type=ComponentType.RBC.value,
                    total_units=total,
                    available_units=avail,
                    reserved_units=total - avail,
                    safety_reserve_units=reserve,
                    expiry_date=now + timedelta(days=28),
                    batch_number=f"BB-{bank.code}-{bg}-{now.strftime('%m%d')}",
                    status=status,
                )
                db.add(batch)

        # 2. Seed Hospital Inventories (Base hospital trauma reserves)
        for hosp in hospitals:
            for bg in all_groups:
                reserve = InventoryReserveEngine.calculate_hospital_safety_reserve(
                    blood_group=bg,
                    trauma_level=hosp.trauma_level,
                    emergency_capacity=hosp.emergency_capacity or "STANDARD",
                )
                # Hospitals typically keep just above safety reserve
                avail = reserve + (5 if bg in [BloodGroup.O_POS.value, BloodGroup.A_POS.value] else 2)
                total = avail + 2

                status = InventoryReserveEngine.evaluate_inventory_status(avail, reserve).value

                batch = InventoryBatch(
                    id=str(uuid.uuid4()),
                    facility_type="HOSPITAL",
                    hospital_id=hosp.id,
                    blood_group=bg,
                    component_type=ComponentType.RBC.value,
                    total_units=total,
                    available_units=avail,
                    reserved_units=2,
                    safety_reserve_units=reserve,
                    expiry_date=now + timedelta(days=21),
                    batch_number=f"HOSP-{hosp.code}-{bg}-{now.strftime('%m%d')}",
                    status=status,
                )
                db.add(batch)
        db.commit()

        print("[Seed] Seeding Synthetic Donors...")
        donor_groups = [
            (BloodGroup.O_NEG.value, 6),
            (BloodGroup.O_POS.value, 10),
            (BloodGroup.A_POS.value, 8),
            (BloodGroup.A_NEG.value, 4),
            (BloodGroup.B_POS.value, 8),
            (BloodGroup.B_NEG.value, 3),
            (BloodGroup.AB_POS.value, 3),
            (BloodGroup.AB_NEG.value, 2),
        ]

        donor_idx = 1001
        for bg, count in donor_groups:
            for _ in range(count):
                # Spread around NCR
                lat_offset = ((donor_idx % 10) - 5) * 0.02
                lon_offset = ((donor_idx % 7) - 3) * 0.02

                donor = Donor(
                    id=str(uuid.uuid4()),
                    anonymous_id=f"DONOR-DEL-{donor_idx}",
                    name=f"Synthetic Donor {donor_idx}",
                    blood_group=bg,
                    location="Central NCR",
                    latitude=round(28.5700 + lat_offset, 4),
                    longitude=round(77.2100 + lon_offset, 4),
                    last_donated_date=now - timedelta(days=95 + (donor_idx % 40)),
                    availability_status="AVAILABLE_IMMEDIATE",
                    contact_token=f"tok_sha256_{donor_idx}",
                )
                db.add(donor)
                donor_idx += 1
        db.commit()

        print("[Seed] Seeding Pre-calculated Routes...")
        # Add pre-computed routes between all blood banks and hospitals
        for bank in blood_banks:
            for hosp in hospitals:
                logistics = LogisticsEngine.compute_logistics(
                    origin_lat=bank.latitude,
                    origin_lon=bank.longitude,
                    dest_lat=hosp.latitude,
                    dest_lon=hosp.longitude,
                    urgency=UrgencyLevel.URGENT.value,
                    traffic_factor=1.1,
                )
                route = Route(
                    id=str(uuid.uuid4()),
                    source_type="BLOOD_BANK",
                    source_id=bank.id,
                    destination_hospital_id=hosp.id,
                    distance_km=logistics["distance_km"],
                    estimated_minutes=logistics["estimated_minutes"],
                    traffic_factor=1.1,
                    status="OPEN",
                )
                db.add(route)
        db.commit()

        print("[Seed] Seeding Initial Simulation Events & Demo Requests...")
        demo_request = BloodRequest(
            id="req-trauma-demo-001",
            hospital_id=hospitals[0].id,  # AIIMS Trauma Center
            blood_group=BloodGroup.O_NEG.value,
            component_type=ComponentType.RBC.value,
            units_requested=6,
            urgency=UrgencyLevel.CRITICAL_IMMEDIATE.value,
            clinical_notes="POLYTRAUMA_EMERGENCY_SURGERY; patient_id_hash=pat_anon_9831a",
            max_eta_minutes=30,
            status="PENDING",
        )
        db.add(demo_request)

        demo_event = Event(
            id=str(uuid.uuid4()),
            event_type="DEMAND_SURGE",
            entity_type="HOSPITAL",
            entity_id=hospitals[0].id,
            payload='{"cause": "Highway Multi-Vehicle Collision", "expected_trauma_intake": 4}',
            triggered_replan=False,
        )
        db.add(demo_event)
        db.commit()

        print(f"[Seed] Successfully seeded {len(hospitals)} hospitals, {len(blood_banks)} blood banks, 44 donors, and 42 routes.")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
