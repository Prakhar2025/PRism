import re
from typing import Dict, List, Any
import networkx as nx
from tree_sitter import Language, Parser
import tree_sitter_python
import tree_sitter_javascript
import tree_sitter_go
import tree_sitter_java


LANGUAGE_MAP = {
    '.py': ('python', tree_sitter_python),
    '.js': ('javascript', tree_sitter_javascript),
    '.ts': ('javascript', tree_sitter_javascript),
    '.jsx': ('javascript', tree_sitter_javascript),
    '.tsx': ('javascript', tree_sitter_javascript),
    '.go': ('go', tree_sitter_go),
    '.java': ('java', tree_sitter_java),
}

DOMAIN_KEYWORDS = {
    'auth': ['auth', 'login', 'session', 'token', 'oauth', 'jwt'],
    'payment': ['payment', 'billing', 'invoice', 'checkout', 'stripe', 'paypal'],
    'notification': ['notification', 'email', 'sms', 'alert', 'message'],
    'user': ['user', 'profile', 'account', 'customer'],
    'order': ['order', 'cart', 'purchase', 'transaction'],
    'infra': ['config', 'deploy', 'docker', 'kubernetes', 'ci', 'cd', 'pipeline'],
    'docs': ['docs', 'documentation', 'readme', 'guide'],
}


def detect_language(filename: str) -> str:
    for ext, (lang, _) in LANGUAGE_MAP.items():
        if filename.endswith(ext):
            return lang
    return 'unknown'


def is_test_file(filename: str) -> bool:
    lower = filename.lower()
    return any(pattern in lower for pattern in ['test', 'spec', '_test', '.test.'])


def infer_domain(filepath: str) -> str:
    lower_path = filepath.lower()
    path_segments = lower_path.split('/')
    
    for domain, keywords in DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if any(keyword in segment for segment in path_segments):
                return domain
    
    return 'general'


def extract_imports_python(tree, source_code: bytes) -> List[str]:
    imports = []
    
    def traverse(node):
        if node.type == 'import_statement':
            for child in node.children:
                if child.type == 'dotted_name':
                    imports.append(source_code[child.start_byte:child.end_byte].decode('utf-8'))
        elif node.type == 'import_from_statement':
            for child in node.children:
                if child.type == 'dotted_name':
                    imports.append(source_code[child.start_byte:child.end_byte].decode('utf-8'))
        
        for child in node.children:
            traverse(child)
    
    traverse(tree.root_node)
    return imports


def extract_imports_javascript(tree, source_code: bytes) -> List[str]:
    imports = []
    
    def traverse(node):
        if node.type == 'import_statement':
            for child in node.children:
                if child.type == 'string':
                    import_path = source_code[child.start_byte:child.end_byte].decode('utf-8').strip('"\'')
                    imports.append(import_path)
        elif node.type == 'call_expression':
            func = node.child_by_field_name('function')
            if func and source_code[func.start_byte:func.end_byte].decode('utf-8') == 'require':
                args = node.child_by_field_name('arguments')
                if args:
                    for child in args.children:
                        if child.type == 'string':
                            import_path = source_code[child.start_byte:child.end_byte].decode('utf-8').strip('"\'')
                            imports.append(import_path)
        
        for child in node.children:
            traverse(child)
    
    traverse(tree.root_node)
    return imports


def extract_imports_go(tree, source_code: bytes) -> List[str]:
    imports = []
    
    def traverse(node):
        if node.type == 'import_declaration':
            for child in node.children:
                if child.type == 'import_spec':
                    for spec_child in child.children:
                        if spec_child.type == 'interpreted_string_literal':
                            import_path = source_code[spec_child.start_byte:spec_child.end_byte].decode('utf-8').strip('"')
                            imports.append(import_path)
                elif child.type == 'import_spec_list':
                    for spec in child.children:
                        if spec.type == 'import_spec':
                            for spec_child in spec.children:
                                if spec_child.type == 'interpreted_string_literal':
                                    import_path = source_code[spec_child.start_byte:spec_child.end_byte].decode('utf-8').strip('"')
                                    imports.append(import_path)
        
        for child in node.children:
            traverse(child)
    
    traverse(tree.root_node)
    return imports


def extract_imports_java(tree, source_code: bytes) -> List[str]:
    imports = []
    
    def traverse(node):
        if node.type == 'import_declaration':
            for child in node.children:
                if child.type in ['scoped_identifier', 'identifier']:
                    imports.append(source_code[child.start_byte:child.end_byte].decode('utf-8'))
        
        for child in node.children:
            traverse(child)
    
    traverse(tree.root_node)
    return imports


def parse_file_with_treesitter(filename: str, patch: str, language: str) -> List[str]:
    if language == 'unknown':
        return []
    
    try:
        lang_module = LANGUAGE_MAP.get(f'.{language.split("-")[0]}')
        if not lang_module:
            return []
        
        _, tree_sitter_module = lang_module
        ts_language = Language(tree_sitter_module.language())
        parser = Parser(ts_language)
        
        added_lines = []
        for line in patch.split('\n'):
            if line.startswith('+') and not line.startswith('+++'):
                added_lines.append(line[1:])
        
        if not added_lines:
            return []
        
        source_code = '\n'.join(added_lines).encode('utf-8')
        tree = parser.parse(source_code)
        
        if language == 'python':
            return extract_imports_python(tree, source_code)
        elif language in ['javascript', 'typescript']:
            return extract_imports_javascript(tree, source_code)
        elif language == 'go':
            return extract_imports_go(tree, source_code)
        elif language == 'java':
            return extract_imports_java(tree, source_code)
        
        return []
    except Exception:
        return []


def build_dependency_graph(files_data: List[Dict[str, Any]]) -> nx.DiGraph:
    graph = nx.DiGraph()
    
    for file_data in files_data:
        filename = file_data['filename']
        graph.add_node(filename)
    
    for file_data in files_data:
        filename = file_data['filename']
        imports = file_data.get('imports', [])
        
        for imported in imports:
            for other_file in files_data:
                other_filename = other_file['filename']
                if other_filename != filename:
                    if imported in other_filename or other_filename.endswith(imported):
                        graph.add_edge(filename, other_filename)
    
    return graph


def compute_dependents(graph: nx.DiGraph, filename: str) -> tuple[int, int, List[str]]:
    try:
        reverse_graph = graph.reverse()
        
        direct_dependents = list(reverse_graph.successors(filename))
        direct_count = len(direct_dependents)
        
        transitive = set()
        queue = list(direct_dependents)
        visited = set([filename])
        
        while queue:
            node = queue.pop(0)
            if node in visited:
                continue
            visited.add(node)
            transitive.add(node)
            
            for successor in reverse_graph.successors(node):
                if successor not in visited:
                    queue.append(successor)
        
        transitive_count = len(transitive)
        
        return direct_count, transitive_count, direct_dependents
    except Exception:
        return 0, 0, []


def parse_pr(pr_data: Dict[str, Any]) -> Dict[str, Any]:
    files = pr_data.get('files', [])
    
    files_data = []
    for file_info in files:
        filename = file_info.get('filename', '')
        patch = file_info.get('patch', '')
        
        language = detect_language(filename)
        imports = parse_file_with_treesitter(filename, patch, language)
        
        files_data.append({
            'filename': filename,
            'language': language,
            'patch': patch,
            'imports': imports,
            'is_test': is_test_file(filename),
            'domain': infer_domain(filename),
        })
    
    graph = build_dependency_graph(files_data)
    
    changed_files = []
    for file_data in files_data:
        filename = file_data['filename']
        direct_count, transitive_count, dependent_list = compute_dependents(graph, filename)
        
        changed_files.append({
            'filename': filename,
            'language': file_data['language'],
            'direct_dependents': direct_count,
            'transitive_dependents': transitive_count,
            'dependent_files': dependent_list,
            'is_test': file_data['is_test'],
            'domain': file_data['domain'],
            'imports': file_data['imports'],
        })
    
    return {
        'nodes': graph.number_of_nodes(),
        'edges': graph.number_of_edges(),
        'changed_files': changed_files,
    }

# Made with Bob
