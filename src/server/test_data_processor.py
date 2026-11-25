import os
import unittest

from src.server.data_processor import (
    build_comparison_matrix,
    compute_fleet_analytics,
    preprocess_ai_query,
    preprocess_catalog,
    preprocess_product,
    preprocess_rfq,
)


class TestDataProcessor(unittest.TestCase):
    def test_preprocess_product_normalizes_and_validates(self):
        result = preprocess_product(
            {
                "mode": "create",
                "data": {
                    "category_id": "cat-alunautic",
                    "sku": "  alu-test-100  ",
                    "title": "Alunautic  Test   Craft",
                    "price_usd": "12500.456",
                    "stock_quantity": 3,
                    "lead_time_days": 14,
                    "image_url": "/images/products/prod_alu_wb_550.png",
                },
                "specifications": [
                    {"key": "Length Overall (LOA)", "value": "8.50", "unit": "m", "highlight": True},
                    {"key": "Max Speed", "value": "34", "unit": "kn", "highlight": True},
                ],
            }
        )
        self.assertEqual(result["product"]["sku"], "ALU-TEST-100")
        self.assertEqual(result["product"]["title"], "Alunautic Test Craft")
        self.assertEqual(result["product"]["price_usd"], 12500.46)
        self.assertEqual(result["specifications"][0]["unit"], "Meters")
        self.assertEqual(result["specifications"][1]["unit"], "Knots")

    def test_preprocess_product_rejects_unsafe_url_and_negative_price(self):
        with self.assertRaises(ValueError):
            preprocess_product(
                {
                    "mode": "create",
                    "data": {
                        "category_id": "cat-alunautic",
                        "sku": "ALU-BAD-1",
                        "title": "Bad Url Vessel",
                        "price_usd": 1000,
                        "stock_quantity": 1,
                        "image_url": "javascript:alert(1)",
                    },
                }
            )
        with self.assertRaises(ValueError):
            preprocess_product(
                {
                    "mode": "create",
                    "data": {
                        "category_id": "cat-alunautic",
                        "sku": "ALU-BAD-2",
                        "title": "Negative Price Vessel",
                        "price_usd": -50,
                        "stock_quantity": 1,
                    },
                }
            )

    def test_preprocess_rfq_rejects_negative_quantity_and_normalizes_email(self):
        cleaned = preprocess_rfq(
            {
                "customer_name": "  Jane  Doe ",
                "email": "Buyer@EXAMPLE.COM",
                "phone": "+91 70836-78003!@#",
                "quantity_requested": 4,
            }
        )
        self.assertEqual(cleaned["customer_name"], "Jane Doe")
        self.assertEqual(cleaned["email"], "Buyer@example.com")
        self.assertEqual(cleaned["quantity_requested"], 4)
        self.assertEqual(cleaned["phone"], "+91 70836-78003")

        with self.assertRaises(ValueError):
            preprocess_rfq(
                {
                    "customer_name": "Jane Doe",
                    "email": "buyer@example.com",
                    "quantity_requested": -5,
                }
            )

    def test_preprocess_catalog_and_comparison_matrix(self):
        raw = [
            {
                "id": "p1",
                "sku": "alu-wb-550",
                "title": "Alunautic WB 5.50",
                "category_slug": "alunautic-aluminium",
                "price_usd": 48500,
                "stock_quantity": 4,
                "lead_time_days": 45,
                "certifications": ["ISO 9001:2015"],
                "specifications": [
                    {"key": "Length Overall (LOA)", "value": "5.50", "unit": "m", "highlight": True},
                    {"key": "Max Speed", "value": "34", "unit": "kn", "highlight": True},
                ],
            },
            {
                "id": "p2",
                "sku": "bs-rib-650",
                "title": "Blue Spirit 650",
                "category_slug": "blue-spirit-ribs",
                "price_usd": 59000,
                "stock_quantity": 5,
                "lead_time_days": 40,
                "certifications": ["SOLAS"],
                "specifications": [
                    {"key": "Length Overall (LOA)", "value": "6.50", "unit": "Meters", "highlight": True},
                    {"key": "Max Speed", "value": "42", "unit": "Knots", "highlight": True},
                ],
            },
        ]
        catalog = preprocess_catalog({"products": raw})["products"]
        self.assertEqual(catalog[0]["sku"], "ALU-WB-550")
        self.assertEqual(catalog[0]["derived_metrics"]["loa_meters"], 5.5)
        self.assertEqual(catalog[0]["derived_metrics"]["readiness_status"], "LOW_STOCK")

        matrix_result = build_comparison_matrix({"products": raw})
        cost_row = next(r for r in matrix_result["matrix"] if r["criteria"] == "Cost & Acquisition")
        speed_row = next(r for r in matrix_result["matrix"] if r["criteria"] == "Max Speed")
        self.assertEqual(cost_row["winnerSku"], "ALU-WB-550")
        self.assertEqual(speed_row["winnerSku"], "BS-RIB-650")

    def test_preprocess_ai_query_extracts_signals(self):
        res = preprocess_ai_query(
            {
                "prompt": "  Find   workboats under $100000 with low stock \x00 ",
                "history": [{"role": "user", "text": "  hello  "}, {"role": "assistant", "text": ""}],
            }
        )
        self.assertEqual(res["sanitizedPrompt"], "Find workboats under $100000 with low stock")
        self.assertEqual(res["signals"]["maxPrice"], 100000.0)
        self.assertTrue(res["signals"]["lowStockQuery"])
        self.assertEqual(len(res["cleanedHistory"]), 1)

    def test_compute_fleet_analytics_on_live_db(self):
        db_path = os.path.abspath("data/hyprecision.sqlite")
        if os.path.exists(db_path):
            stats = compute_fleet_analytics({"dbPath": db_path})
            self.assertGreater(stats["productsCount"], 0)
            self.assertEqual(stats["pythonAnalytics"]["engine"], "python3-data-processor")


if __name__ == "__main__":
    unittest.main()
