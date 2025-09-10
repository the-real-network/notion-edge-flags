export function parseEdgeConfigConnection(connectionString: string): {
  edgeConfigId: string;
  token: string;
} {
  try {
    const url = new URL(connectionString);
    const token = url.searchParams.get('token');
    const pathParts = url.pathname.split('/');
    const edgeConfigId = pathParts[pathParts.length - 1];
    
    if (!token || !edgeConfigId) {
      throw new Error('Invalid connection string format');
    }
    
    return { edgeConfigId, token };
  } catch {
    throw new Error('Failed to parse Edge Config connection string');
  }
}
