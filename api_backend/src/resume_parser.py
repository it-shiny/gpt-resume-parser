import os
from pdfminer.high_level import extract_text
from openai import OpenAI
import logging
import json
import docx2txt
import textract
import csv


from tokenizer import num_tokens_from_string

class ResumeParser():
    def __init__(self, OPENAI_API_KEY):
        # set GPT-3 API key from the environment vairable
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        # GPT-3 completion questions
        self.prompt_questions = \
"""Summarize the text below into a JSON with exactly the following structure \
    {Name, Email, Phone, Location, Recent Role/Title, Skills: [], Education: {university, education_level (BS, MS, or PhD), graduation_year,}\
    Experience: [{job_title, company, location, duration, job_summary}], Work Authorization, Linkedin URL}
"""
       # set up this parser's logger
        logging.basicConfig(filename='./logs/parser.log', level=logging.DEBUG)
        self.logger = logging.getLogger()

    def query_completion(self: object,
                        prompt: str,
                        engine: str='gpt-3.5-turbo',
                        max_tokens: int = 100,
                        ) -> object:
        """
        Base function for querying GPT-3. 
        Send a request to GPT-3 with the passed-in function parameters and return the response object.
        :param prompt: GPT-3 completion prompt.
        """
        self.logger.info(f'query_completion: using {engine}')

        estimated_prompt_tokens = num_tokens_from_string(prompt, engine)
        estimated_answer_tokens = (max_tokens - estimated_prompt_tokens)

        self.logger.info(f'Tokens: {estimated_prompt_tokens} + {estimated_answer_tokens} = {max_tokens}')

        response = self.client.chat.completions.create(
            messages=[{
                'role': 'user',
                'content': prompt
            }],
            model="gpt-3.5-turbo",
        )
        return response

    def extract_text_from_file(self: object, file_path: str) -> str:
        file_ext = os.path.splitext(file_path)[1]
        text = ""

        if file_ext == '.doc':
            text = textract.process(file_path)
            return text.decode('utf-8')

        if file_ext == '.docx':
            """Extract text from docx file including body, headers, footers, and content controls."""
            text = docx2txt.process(file_path)
            return text
        elif file_ext == '.pdf':
            text = extract_text(file_path)

        return text 
    
    def query_resume(self: object, file_path: str, format: str = 'json') -> dict:
        """
        Query GPT-3 for the work experience and / or basic information from the resume at the PDF file path.
        :param file_path: Path to the file file.
        :return dictionary of resume with keys (basic_info, work_experience).
        """
        # Check if the file already parsed.
        file_name = os.path.basename(file_path)

        if (self.check_file_exists(file_name)):
            return 'That file has been already parsed before.'

        # Build ChatGPT prompt combining base prompt and resume extraction.
        extracted = self.extract_text_from_file(file_path)
        prompt = self.prompt_questions + '\n' + extracted

        # Get the ChatGPT response
        response = self.query_completion(prompt)
        response_text = response.choices[0].message.content
        parsed_json = json.loads(response_text)

        parsed_json = {'File Name': file_name, **parsed_json}

        print(response_text)

        if (format == 'json') :
            with open('./output/data.json', 'w') as file:
                json.dump(parsed_json, file, indent=4)
        else:
            # Insert new line
            self.append_row_to_top_csv(parsed_json, './output/data.csv')

        return f"Resume parse result has been successfully saved at ./output/data.{ 'json' if format == 'json' else 'csv' }"
    
    def append_row_to_top_csv(self: object, new_data: list, file_path: str):
        # Initialize a list to hold existing data
        existing_data = []
        
        # Check if the file exists to decide on including the header
        file_exists = os.path.exists(file_path)

        # Read the existing data if the file exist
        if file_exists:
            with open(file_path, 'r', newline='') as file:
                reader = csv.reader(file)
                existing_data = list(reader)
    

        # Write everything back
        with open(file_path, 'w', newline='') as file:
            writer = csv.writer(file)

            if not file_exists:
                writer.writerow(list(new_data))
                writer.writerow(list(new_data.values()))

            else:
                # Insert new data at the beginning
                existing_data.insert(1, list(new_data.values()))  # Insert at position 1 to skip the header
                writer.writerows(existing_data)

    def check_file_exists(self: object, file_name: str):
        try:
            with open('./output/data.csv', 'r') as csv_file:
                reader = csv.DictReader(csv_file)
                for row in reader:
                    # Assuming the field name in the CSV is 'file name'
                    if row['File Name'] == file_name:
                        return True
        except FileNotFoundError:
            print(f"The csv file does not exist.")
        except Exception as e:
            print(f"An error occurred: {e}")
        
        return False