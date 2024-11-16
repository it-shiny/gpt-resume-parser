import os
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS

from env_parser import parse_env_file
from resume_parser import ResumeParser

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = './uploaded-resumes'
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'doc'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def is_allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/parse-resume', methods=['POST'])
def parse_resume():
    # If there's no file in request
    if 'file' not in request.files:
        return jsonify(error="No file part"), 400

    file = request.files['file']

    # If file exists in request but the file is not selected.
    if file.filename == '':
        return jsonify(error="No selected file"), 400
    
    # If the file is valid
    if file and is_allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

        # Avoid duplication of same resume.
        if (os.path.exists(file_path)):
            return jsonify({'message': 'You uploaded already the resume.'}), 200

        file.save(file_path)

        format = request.form.get('format', 'json') # Default format is json
        output_folder = request.form.get('output_folder', app.config['UPLOAD_FOLDER'])

        parser = ResumeParser(os.getenv('OPEN_API_KEY'))

        try:
            response = parser.query_resume(file_path, format)

            return jsonify({'message': response}), 200
        except Exception as e:
            return jsonify(error=str(e)), 500


@app.route('/parse-resume-folder', methods=['POST'])
def parse_resume_folder():
    # Check if the post request has the files part
    if 'files' not in request.files:
        return jsonify(error="No files part"), 400

    files = request.files.getlist('files')

    if not files or files[0].filename == '':
        return jsonify(error="No selected files"), 400

    responses = []
    
    for file in files:
        if file and is_allowed_file(file.filename):
            filename = secure_filename(file.filename)

            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        
            print(file_path, filename)
            
            file.save(file_path)

            # Assuming `ResumeParser` is a class you've defined to handle parsing
            # Adjust the following line according to how your parser is implemented
            format = request.form.get('format', 'json') # Default format is json
            
            output_folder = request.form.get('output_folder', app.config['UPLOAD_FOLDER'])

            try:
                # Your parsing logic here, for example:
                parser = ResumeParser(os.getenv('OPEN_API_KEY'))
            
                response = parser.query_resume(file_path, format)
                
                responses.append({'filename': filename, 'message': response})
            except Exception as e:
                responses.append({'filename': filename, 'error': str(e)})
    
    return jsonify(responses), 200


if __name__ == '__main__':
    app.run(debug=True)

