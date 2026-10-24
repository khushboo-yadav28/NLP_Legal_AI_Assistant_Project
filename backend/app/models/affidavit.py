import re
from typing import Optional, Union
from pydantic import BaseModel, Field, model_validator


def parse_affidavit_from_query(query: str, default_name: Optional[str] = None) -> dict:
    """
    Intelligent NLP parameter extraction from natural language query strings.
    Extracts document type, full name, old/new values, relative name, age, and location.
    """
    if not query:
        return {}

    lower = query.lower()
    extracted: dict = {}

    # 1. Detect Document Intent
    if any(k in lower for k in ["surname", "last name", "lastname", "family name"]):
        extracted["document_type"] = "surname_change"
    elif any(k in lower for k in ["date of birth", "birth date", "born on", "dob", "d.o.b."]):
        extracted["document_type"] = "dob_correction"
    elif any(k in lower for k in ["address", "residence", "residential", "apartment", "relocat", "shifted"]):
        extracted["document_type"] = "address_change"
    elif any(k in lower for k in ["father", "spouse", "parent", "mother", "husband", "wife"]) and any(k in lower for k in ["relation", "name", "spelling", "update", "correction"]):
        extracted["document_type"] = "relation_update"
    elif any(k in lower for k in ["one and the same", "one and same", "same person", "alias", "name variation"]):
        extracted["document_type"] = "one_and_same"
    elif any(k in lower for k in ["name", "spelling", "correction"]):
        extracted["document_type"] = "name_change"

    # 2. Extract Full / Deponent Name
    name_patterns = [
        r"(?:my name is|i am|myself|deponent is|name:?)\s*['\"]?([A-Za-z\s\.]+?)['\"]?(?:,\s*|\s+and|\s+i want|\s+need|\s+stating|\s+noticed|\.|$)",
        r"I,\s*[*_]*([A-Za-z\s\.]+?)[*_]*,\s*(?:Son|Daughter|Spouse|S\/o|D\/o|W\/o)",
        r"(?:Full Name|Deponent Name)\s*:\s*[*_]*([A-Za-z\s\.]+?)[*_]*(?:\n|,|$)",
    ]
    for pat in name_patterns:
        m = re.search(pat, query, re.IGNORECASE)
        if m and m.group(1):
            val = m.group(1).strip()
            if len(val) > 1 and not val.lower().startswith("changing") and not val.lower().startswith("officially"):
                extracted["full_name"] = val
                break

    # 3. Extract From ... To ... (Old and New values)
    from_to = re.search(
        r"(?:from|spelling from|surname from|name from)\s*['\"“]?([A-Za-z0-9\s\.\-\/]+?)['\"”]?\s+to\s+['\"“]?([A-Za-z0-9\s\.\-\/]+?)['\"”'’]?(?:,|\.|\s+in|\s+for|\s+and|\s+please|$)",
        query,
        re.IGNORECASE,
    )
    if from_to:
        extracted["old_value"] = from_to.group(1).strip()
        extracted["new_value"] = from_to.group(2).strip()
        if not extracted.get("full_name") and " " in extracted["old_value"]:
            extracted["full_name"] = extracted["old_value"]

    # 4. Extract Specific Surname Patterns
    if extracted.get("document_type") == "surname_change":
        # E.g. "change my surname to Verma" when name is "Rahul Sharma"
        to_surname_match = re.search(
            r"(?:change(?:\s+my)?\s+surname\s+to|new\s+surname\s+is)\s*['\"“]?([A-Za-z]+)['\"”'’]?",
            query,
            re.IGNORECASE,
        )
        if to_surname_match and not extracted.get("new_value"):
            new_sur = to_surname_match.group(1).strip()
            fn = extracted.get("full_name") or default_name or ""
            if fn and " " in fn:
                first_part = fn.rsplit(" ", 1)[0]
                extracted["new_value"] = f"{first_part} {new_sur}"
                extracted["old_value"] = fn
            else:
                extracted["new_value"] = new_sur
                if fn:
                    extracted["old_value"] = fn

    # 5. Extract Date of Birth patterns
    if extracted.get("document_type") == "dob_correction":
        # Look for dates like 15-08-1998, 22/11/2001, 15 August 1998
        dates = re.findall(
            r"(\b\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}\b|\b\d{1,2}\s+[A-Za-z]+\s+\d{4}\b)",
            query,
            re.IGNORECASE,
        )
        if len(dates) >= 2:
            extracted["old_value"] = dates[0]
            extracted["new_value"] = dates[1]
        elif len(dates) == 1:
            extracted["new_value"] = dates[0]
            extracted["old_value"] = "[Incorrect Recorded DOB]"

    # 6. Extract City and State
    city_match = re.search(
        r"(?:in|at|city of|resident of)\s*([A-Za-z]+?)(?:,|\.|\s+state|\s+city|\s+please|\s+and|$)",
        query,
        re.IGNORECASE,
    )
    if city_match:
        city_candidate = city_match.group(1).strip()
        non_cities = {"official", "my", "our", "the", "an", "a", "this", "word", "government", "educational"}
        if city_candidate.lower() not in non_cities and len(city_candidate) > 2:
            extracted["city"] = city_candidate

    # 7. Extract Age
    age_match = re.search(r"(?:aged|age|aged about)\s*(\d{1,2})\s*(?:years)?", query, re.IGNORECASE)
    if age_match:
        extracted["age"] = int(age_match.group(1))

    # 8. Extract Father / Spouse Name
    parent_match = re.search(
        r"(?:son of|daughter of|spouse of|s\/o|d\/o|w\/o|father's name is|father is)\s*['\"]?([A-Za-z\s\.]+?)['\"]?(?:,|\.|\s+aged|\s+residing|$)",
        query,
        re.IGNORECASE,
    )
    if parent_match:
        extracted["father_or_spouse_name"] = parent_match.group(1).strip()

    return extracted


class AffidavitRequest(BaseModel):
    document_type: Optional[str] = Field(
        default="name_change",
        description="Type of affidavit: 'surname_change', 'name_change', 'address_change', 'dob_correction', 'relation_update', 'one_and_same'",
    )
    query: Optional[str] = Field(
        default=None,
        description="Optional natural language query requesting the affidavit for automatic parsing",
    )
    full_name: Optional[str] = Field(default=None, description="Deponent's full name")
    old_value: Optional[str] = Field(
        default=None,
        description="Previous or incorrect value (e.g. old surname, old name, old address, incorrect DOB, incorrect relation name)",
    )
    new_value: Optional[str] = Field(
        default=None,
        description="New or corrected value (e.g. new surname, new name, new address, correct DOB, correct relation name)",
    )
    old_name: Optional[str] = Field(default=None, description="Alternative field for current/old name")
    new_name: Optional[str] = Field(default=None, description="Alternative field for new/corrected name")
    father_or_spouse_name: Optional[str] = Field(default=None, description="Deponent's father or spouse name")
    father_name: Optional[str] = Field(default=None, description="Alternative field for father's name")
    age: Optional[Union[int, str]] = Field(default=None, description="Deponent's age in years")
    address: Optional[str] = Field(default=None, description="Deponent's residential address")
    city: Optional[str] = Field(default=None, description="City of residence")
    state: Optional[str] = Field(default=None, description="State of residence")

    @model_validator(mode="after")
    def populate_defaults_and_aliases(self):
        # 1. If natural language query is provided, auto-extract parameters if missing
        if self.query and self.query.strip():
            parsed = parse_affidavit_from_query(self.query.strip())
            if not self.document_type or self.document_type == "name_change":
                if parsed.get("document_type"):
                    self.document_type = parsed["document_type"]
            if not self.full_name and parsed.get("full_name"):
                self.full_name = parsed["full_name"]
            if not self.old_value and parsed.get("old_value"):
                self.old_value = parsed["old_value"]
            if not self.new_value and parsed.get("new_value"):
                self.new_value = parsed["new_value"]
            if not self.father_or_spouse_name and parsed.get("father_or_spouse_name"):
                self.father_or_spouse_name = parsed["father_or_spouse_name"]
            if (self.age is None or str(self.age).strip() == "") and parsed.get("age"):
                self.age = parsed["age"]
            if not self.city and parsed.get("city"):
                self.city = parsed["city"]
            if not self.state and parsed.get("state"):
                self.state = parsed["state"]

        # 2. Normalize document_type
        doc_type = (self.document_type or "name_change").strip().lower()
        if "surname" in doc_type or "last_name" in doc_type or "family_name" in doc_type:
            self.document_type = "surname_change"
        elif "dob" in doc_type or "birth" in doc_type:
            self.document_type = "dob_correction"
        elif "relation" in doc_type or "parent" in doc_type or "spouse" in doc_type:
            self.document_type = "relation_update"
        elif "same" in doc_type or "one_and" in doc_type:
            self.document_type = "one_and_same"
        elif "address" in doc_type or "residence" in doc_type:
            self.document_type = "address_change"
        else:
            self.document_type = "name_change"

        # 3. Resolve common deponent fields
        if not self.full_name or not self.full_name.strip():
            self.full_name = self.old_name.strip() if self.old_name and self.old_name.strip() else "[Deponent Full Name]"
        else:
            self.full_name = self.full_name.strip()

        if not self.father_or_spouse_name or not self.father_or_spouse_name.strip():
            self.father_or_spouse_name = (
                self.father_name.strip() if self.father_name and self.father_name.strip() else "[Father's / Spouse's Name]"
            )
        else:
            self.father_or_spouse_name = self.father_or_spouse_name.strip()

        if self.age is None or str(self.age).strip() == "":
            self.age = "[Age]"
        else:
            self.age = str(self.age).strip()

        if not self.address or not self.address.strip():
            self.address = "[Residential Address]"
        else:
            self.address = self.address.strip()

        if not self.city or not self.city.strip():
            self.city = "[City]"
        else:
            self.city = self.city.strip()

        if not self.state or not self.state.strip():
            self.state = "[State]"
        else:
            self.state = self.state.strip()

        # 4. Document type specific field resolution
        if self.document_type == "surname_change":
            candidate_old = self.old_value or self.old_name or self.full_name
            if candidate_old and candidate_old.strip() and candidate_old != "[Deponent Full Name]":
                self.full_name = candidate_old.strip()
                self.old_value = candidate_old.strip()
                self.old_name = candidate_old.strip()
            else:
                self.old_value = self.full_name
                self.old_name = self.full_name

            candidate_new = self.new_value or self.new_name
            if candidate_new and candidate_new.strip():
                self.new_name = candidate_new.strip()
                self.new_value = candidate_new.strip()
            else:
                self.new_name = f"{self.full_name} (New Surname)" if self.full_name != "[Deponent Full Name]" else "[New Full Name with Adopted Surname]"
                self.new_value = self.new_name

        elif self.document_type == "dob_correction":
            if not self.old_value or not self.old_value.strip():
                self.old_value = "[Incorrect Recorded DOB, e.g. DD/MM/YYYY]"
            else:
                self.old_value = self.old_value.strip()

            if not self.new_value or not self.new_value.strip():
                self.new_value = "[Actual Correct DOB, e.g. DD/MM/YYYY]"
            else:
                self.new_value = self.new_value.strip()

        elif self.document_type == "relation_update":
            if not self.old_value or not self.old_value.strip():
                self.old_value = "[Incorrect Parent/Spouse Name]"
            else:
                self.old_value = self.old_value.strip()

            if not self.new_value or not self.new_value.strip():
                self.new_value = self.father_or_spouse_name if self.father_or_spouse_name != "[Father's / Spouse's Name]" else "[Correct Parent/Spouse Name]"
            else:
                self.new_value = self.new_value.strip()

        elif self.document_type == "one_and_same":
            if not self.old_value or not self.old_value.strip():
                self.old_value = self.full_name if self.full_name != "[Deponent Full Name]" else "[Name Variation 1]"
            else:
                self.old_value = self.old_value.strip()

            if not self.new_value or not self.new_value.strip():
                self.new_value = self.new_name.strip() if self.new_name and self.new_name.strip() else "[Name Variation 2]"
            else:
                self.new_value = self.new_value.strip()

        elif self.document_type == "address_change":
            if not self.old_value or not self.old_value.strip():
                self.old_value = "[Previous Residential Address]"
            else:
                self.old_value = self.old_value.strip()

            if not self.new_value or not self.new_value.strip():
                self.new_value = self.address if self.address != "[Residential Address]" else "[New Residential Address]"
            else:
                self.new_value = self.new_value.strip()

            self.address = self.new_value

        else:
            # name_change
            candidate_old = self.old_value or self.old_name or self.full_name
            if candidate_old and candidate_old.strip() and candidate_old != "[Deponent Full Name]":
                self.full_name = candidate_old.strip()
                self.old_value = candidate_old.strip()
                self.old_name = candidate_old.strip()
            else:
                self.old_value = self.full_name
                self.old_name = self.full_name

            candidate_new = self.new_value or self.new_name
            if candidate_new and candidate_new.strip():
                self.new_name = candidate_new.strip()
                self.new_value = candidate_new.strip()
            else:
                self.new_name = f"{self.full_name} (Corrected)" if self.full_name != "[Deponent Full Name]" else "[New / Corrected Name]"
                self.new_value = self.new_name

        return self
