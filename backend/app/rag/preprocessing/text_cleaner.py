import re

class TextCleaner:
    """
    Cleans extracted pdf text while preserving legal meaning.
    """

    @staticmethod
    def clean(text: str)-> str:
        if not text:
            return ""

        # Normalize line endings, Replace any \r\n or \r with \n
        text = re.sub(r'\r\n?','\n', text)
        # text = text.replace("\r\n","\n")
        # text = text.replace("\r","\n")

        # Replace tabs with spaces
        text = text.replace("\t"," ")

        # Remove form-feed characters
        text = text.replace("\f"," ")

        # Remove long underscore separators
        text = re.sub(r"_+","",text)

        # Remove repeated hyphen separators
        text = re.sub(r"[-–—]{5,}", "", text)

        # Remove decorative =====
        text = re.sub(r"={5,}", "", text)

        # Remove lines containing only dots
        text = re.sub(r"(?m)^\s*\.+\s*$", "", text)

        # Remove isolated dot-only fragments
        # text = re.sub(r"\n\s*\.\s*\n", "\n", text) 

        # Replace repeated commas
        text = re.sub(r",{2,}", ",", text)

        # Remove extra spaces
        text = re.sub(r"[ ]{2,}"," ",text)

        # Remove extra blank lines
        text = re.sub(r"\n\s*\n+","\n\n",text)

        return text.strip()