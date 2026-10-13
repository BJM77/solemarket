import os

def collect_code_minimal():
    root_dir = '/Users/ai/Desktop/Sneak'
    output_file = '/Users/ai/Desktop/Sneak/allsneak.txt'
    
    exclude_dirs = {'node_modules', '.next', '.git', 'dist', 'build', '.vercel', 'local', 'secrets_staging', 'env', 'scratch', 'docs', 'public', 'scripts'}

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# FULL CODE ARCHITECTURE\n\n")
        
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            level = root.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            f.write(f"{indent}{os.path.basename(root)}/\n")
            sub_indent = ' ' * 4 * (level + 1)
            for file in sorted(files):
                if not file.startswith('.') and not file.endswith(('.jpg', '.png', '.svg', '.ico', '.xml')):
                    f.write(f"{sub_indent}{file}\n")
        
        f.write("\n\n" + "="*80 + "\n")
        f.write("# PAGE CODE (src/app/ directory + Core Configs)\n")
        f.write("="*80 + "\n\n")

        root_configs = ['package.json', 'next.config.js', 'tsconfig.json', 'tailwind.config.ts', 'firestore.rules', 'firestore.indexes.json']
        for config in root_configs:
            file_path = os.path.join(root_dir, config)
            if os.path.exists(file_path):
                f.write(f"\n\n{'#' * 80}\n")
                f.write(f"# FILE: {config}\n")
                f.write(f"{'#' * 80}\n\n")
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as code_f:
                    f.write(code_f.read())

        src_dir = os.path.join(root_dir, 'src')
        for file in sorted(os.listdir(src_dir)):
            file_path = os.path.join(src_dir, file)
            if os.path.isfile(file_path) and file.endswith(('.ts', '.tsx', '.js')) and not file.startswith('.'):
                rel_path = os.path.relpath(file_path, root_dir)
                f.write(f"\n\n{'#' * 80}\n")
                f.write(f"# FILE: {rel_path}\n")
                f.write(f"{'#' * 80}\n\n")
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as code_f:
                    f.write(code_f.read())

        app_dir = os.path.join(root_dir, 'src/app')
        for root, dirs, files in os.walk(app_dir):
            for file in sorted(files):
                if file.endswith(('.tsx', '.ts', '.css')) and not file.startswith('.'):
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, root_dir)
                    
                    f.write(f"\n\n{'#' * 80}\n")
                    f.write(f"# FILE: {rel_path}\n")
                    f.write(f"{'#' * 80}\n\n")
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as code_f:
                            f.write(code_f.read())
                    except Exception as e:
                        f.write(f"Error reading file: {e}\n")

if __name__ == "__main__":
    collect_code_minimal()
