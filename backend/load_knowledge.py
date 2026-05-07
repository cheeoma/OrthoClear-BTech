from pathlib import Path
import chromadb
import hashlib

# Create or connect to ChromaDB using simple settings
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Delete existing collection if it exists so we start fresh
try:
    chroma_client.delete_collection(name="ortho_knowledge")
    print("Cleared existing collection")
except:
    pass

# Create a new collection
collection = chroma_client.get_or_create_collection(
    name="ortho_knowledge"
)

def chunk_text(text, chunk_size=500, overlap=50):
    """
    Break a large text into smaller overlapping chunks.
    chunk_size = how many characters per chunk
    overlap = how many characters to repeat between chunks
    so we dont lose context at the boundaries
    """
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks

def load_knowledge_base():
    knowledge_base_path = Path("./knowledge_base")
    
    all_chunks = []
    all_ids = []
    all_metadata = []
    
    chunk_counter = 0
    
    # Loop through every text file in the knowledge_base folder
    for file_path in knowledge_base_path.glob("*.txt"):
        print(f"Loading file: {file_path.name}")
        
        # Read the file content
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Break the content into chunks
        chunks = chunk_text(content)
        
        for chunk in chunks:
            if len(chunk.strip()) > 50:
                all_chunks.append(chunk)
                all_ids.append(f"chunk_{chunk_counter}")
                all_metadata.append({"source": file_path.name})
                chunk_counter += 1
    
    # Add all chunks to ChromaDB in batches of 50
    # to avoid memory issues
    batch_size = 50
    for i in range(0, len(all_chunks), batch_size):
        batch_chunks = all_chunks[i:i+batch_size]
        batch_ids = all_ids[i:i+batch_size]
        batch_metadata = all_metadata[i:i+batch_size]
        
        collection.add(
            documents=batch_chunks,
            ids=batch_ids,
            metadatas=batch_metadata
        )
        print(f"Loaded batch {i//batch_size + 1}...")
    
    print(f"Successfully loaded {chunk_counter} chunks into ChromaDB!")

if __name__ == "__main__":
    load_knowledge_base()
