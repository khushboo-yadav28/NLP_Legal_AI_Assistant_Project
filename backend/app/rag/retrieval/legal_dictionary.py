"""
Intent-aware legal query expansion.

Maps common user language to the legal terminology
actually used inside Indian statutes and legal documents.
"""

LEGAL_EXPANSIONS = {

    # ==========================================================
    # CONTRACT FORMATION
    # ==========================================================

    "minor": [
        "age of majority",
        "competent to contract",
        "person competent to contract",
        "legal capacity",
        "sound mind",
        "capacity to contract"
    ],

    "child": [
        "minor",
        "age of majority",
        "competent to contract",
        "legal capacity"
    ],

    "adult": [
        "age of majority",
        "competent to contract"
    ],

    "contract": [
        "agreement",
        "promise",
        "obligation",
        "legal agreement"
    ],

    "agreement": [
        "contract",
        "promise",
        "legal agreement"
    ],

    "offer": [
        "proposal",
        "proposal accepted",
        "communication of proposal"
    ],

    "acceptance": [
        "accept",
        "communication of acceptance",
        "accepted proposal"
    ],

    "promise": [
        "agreement",
        "contract"
    ],

    "consideration": [
        "lawful consideration",
        "something in return",
        "valuable consideration"
    ],

    "capacity": [
        "competent to contract",
        "legal capacity",
        "sound mind",
        "age of majority"
    ],

    "consent": [
        "free consent",
        "coercion",
        "fraud",
        "misrepresentation",
        "undue influence",
        "mistake"
    ],

    "free consent": [
        "coercion",
        "undue influence",
        "fraud",
        "misrepresentation",
        "mistake"
    ],

    "coercion": [
        "threat",
        "unlawful pressure",
        "force"
    ],

    "fraud": [
        "misrepresentation",
        "concealment",
        "deceit"
    ],

    "misrepresentation": [
        "false statement",
        "incorrect representation"
    ],

    "void": [
        "void agreement",
        "not enforceable",
        "unenforceable"
    ],

    "voidable": [
        "rescind",
        "cancel agreement",
        "option of party"
    ],

    "cancel contract": [
        "rescission",
        "voidable",
        "terminate agreement"
    ],

    "breach": [
        "breach of contract",
        "default",
        "failure to perform",
        "non performance",
        "contract violation"
    ],

    "damages": [
        "compensation",
        "loss",
        "injury",
        "reasonable compensation"
    ],

    "compensation": [
        "damages",
        "loss",
        "injury"
    ],

    "specific performance": [
        "contract enforcement",
        "specific relief",
        "enforce contract"
    ],

    "agent": [
        "principal",
        "agency",
        "authority",
        "power of attorney"
    ],

    # ==========================================================
    # CONSUMER PROTECTION
    # ==========================================================

    "refund": [
        "return price",
        "replace goods",
        "remove defect",
        "product liability",
        "consumer complaint",
        "compensation"
    ],

    "money back": [
        "refund",
        "return price",
        "return consideration"
    ],

    "replacement": [
        "replace goods",
        "remove defect",
        "repair goods"
    ],

    "repair": [
        "remove defect",
        "replace goods",
        "service"
    ],

    "seller": [
        "product seller",
        "manufacturer",
        "service provider",
        "trader"
    ],

    "online seller": [
        "electronic commerce",
        "e commerce",
        "product seller",
        "online marketplace",
        "manufacturer",
        "service provider"
    ],

    "consumer": [
        "buyer",
        "complainant",
        "purchaser"
    ],

    "complaint": [
        "consumer complaint",
        "District Commission",
        "consumer dispute"
    ],

    "defective": [
        "defect",
        "manufacturing defect",
        "design defect",
        "quality defect"
    ],

    "poor service": [
        "deficiency in service",
        "service deficiency"
    ],

    "fake": [
        "misleading advertisement",
        "unfair trade practice",
        "false representation"
    ],

    "warranty": [
        "express warranty",
        "implied warranty"
    ],

    # ==========================================================
    # EMPLOYMENT
    # ==========================================================

    "employee": [
        "employment",
        "employer",
        "workman",
        "service"
    ],

    "salary": [
        "wages",
        "remuneration",
        "salary payment"
    ],

    "termination": [
        "dismissal",
        "employment termination",
        "service termination",
        "employment end"
    ],

    "notice period": [
        "termination notice",
        "resignation notice",
        "notice requirement"
    ],

    "resignation": [
        "employment termination",
        "notice period"
    ],

    "probation": [
        "probation period",
        "confirmation"
    ],

    "confidentiality": [
        "confidential information",
        "non disclosure",
        "trade secret",
        "NDA"
    ],

    "nda": [
        "non disclosure agreement",
        "confidentiality",
        "confidential information"
    ],

    "intellectual property": [
        "IP",
        "copyright",
        "patent",
        "trade secret",
        "work product"
    ],

    "non compete": [
        "restraint of trade",
        "employment restriction"
    ],

    "intellectual theft": [
        "intellectual property",
        "copyright infringement",
        "patent infringement",
        "trade secret misappropriation",
        "breach of confidentiality",
        "unauthorised access"
    ],

    "ip theft": [
        "intellectual property infringement",
        "trade secret misappropriation",
        "copyright infringement"
    ],

    # ==========================================================
    # RTI
    # ==========================================================

    "rti": [
        "right to information",
        "public authority",
        "information commission",
        "information officer"
    ],

    "government information": [
        "right to information",
        "public authority",
        "public information officer"
    ],

    # ==========================================================
    # INFORMATION TECHNOLOGY
    # ==========================================================

    "cyber crime": [
        "computer resource",
        "computer system",
        "electronic record",
        "unauthorised access"
    ],

    "hack": [
        "unauthorised access",
        "computer resource",
        "computer system"
    ],

    "electronic signature": [
        "digital signature",
        "electronic authentication"
    ],

    "digital signature": [
        "electronic signature"
    ],

}