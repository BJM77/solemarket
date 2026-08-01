import os
import sys

def create_backup(source_dir, output_file):
    # Extensions we want to include in the backup
    valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.css', '.json'}
    # Directories we want to ignore
    ignored_dirs = {'node_modules', '.next', '.git'}

    print(f"Creating backup from {source_dir} to {output_file}...")

    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(source_dir):
            # Modify dirs in-place to avoid walking into ignored directories
            dirs[:] = [d for d in dirs if d not in ignored_dirs]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in valid_extensions:
                    file_path = os.path.join(root, file)
                    
                    # Print a header for each file to make it readable
                    outfile.write("=" * 80 + "\n")
                    outfile.write(f"FILE: {file_path}\n")
                    outfile.write("=" * 80 + "\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            outfile.write(infile.read())
                    except Exception as e:
                        outfile.write(f"// Error reading file: {str(e)}\n")
                    
                    outfile.write("\n\n")

    print("Backup completed successfully!")

if __name__ == "__main__":
    # Base path of the project (assuming script is run from project root or inside scripts/)
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    source_dir = os.path.join(project_root, 'src')
    output_file = os.path.join(project_root, 'site_backup_latest.txt')
    
    create_backup(source_dir, output_file)
