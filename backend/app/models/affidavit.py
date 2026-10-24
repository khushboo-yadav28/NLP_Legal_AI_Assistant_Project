from typing import Optional, Union
from pydantic import BaseModel, Field, model_validator


class AffidavitRequest(BaseModel):
    document_type: Optional[str] = Field(
        default="name_change",
        description="Type of affidavit: 'name_change', 'address_change', 'dob_correction', 'relation_update', 'one_and_same'",
    )
    full_name: Optional[str] = Field(default=None, description="Deponent's full name")
    old_value: Optional[str] = Field(
        default=None,
        description="Previous or incorrect value (e.g. old name, old address, incorrect DOB, incorrect relation name)",
    )
    new_value: Optional[str] = Field(
        default=None,
        description="New or corrected value (e.g. new name, new address, correct DOB, correct relation name)",
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
        # 1. Normalize document_type
        doc_type = (self.document_type or "name_change").strip().lower()
        if "dob" in doc_type or "birth" in doc_type:
            self.document_type = "dob_correction"
        elif "relation" in doc_type or "parent" in doc_type or "spouse" in doc_type:
            self.document_type = "relation_update"
        elif "same" in doc_type or "one_and" in doc_type:
            self.document_type = "one_and_same"
        elif "address" in doc_type or "residence" in doc_type:
            self.document_type = "address_change"
        else:
            self.document_type = "name_change"

        # 2. Resolve common deponent fields
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

        # 3. Document type specific field resolution
        if self.document_type == "dob_correction":
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
