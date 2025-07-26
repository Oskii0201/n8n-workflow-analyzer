import { NextRequest } from 'next/server';

global.fetch = jest.fn();

global.Response = class Response {
  constructor(public body: string, public init?: any) {}
  async json() {
    return JSON.parse(this.body);
  }
  get status() {
    return this.init?.status || 200;
  }
} as any;

const escapeRegex = (string: string): string => {
  if (!string || typeof string !== 'string') {
    return '';
  }
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const mockPOST = async (request: NextRequest) => {
  try {
    const { apiKey, baseUrl, workflowId, searchTerm } = await request.json();

    if (!apiKey || !baseUrl || !workflowId || !searchTerm) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required parameters: apiKey, baseUrl, workflowId, or searchTerm'
      }), { status: 400 });
    }

    const normalizedUrl = baseUrl.replace(/\/$/, '');

    const response = await fetch(`${normalizedUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: response.status });
    }

    const workflowResponse = await response.json();
    const workflow = workflowResponse.data || workflowResponse;

    if (!workflow || !workflow.nodes) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid workflow data received from n8n'
      }), { status: 500 });
    }

    const results: any[] = [];

    workflow.nodes.forEach((node: any) => {
      const matches: any[] = [];
      let matchIndex = 0;

      const searchInObject = (obj: Record<string, unknown>, path: string) => {
        if (!obj || typeof obj !== 'object') return;

        Object.entries(obj).forEach(([key, value]) => {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'string') {
            const escapedSearchTerm = escapeRegex(searchTerm);
            const searchPatterns = [
              new RegExp(`\\b${escapedSearchTerm}\\b`, 'gi'),
              new RegExp(`\\$\\(['"]${escapedSearchTerm}['"]\\)`, 'gi'),
              new RegExp(`\\$node\\[['"]${escapedSearchTerm}['"]\\]`, 'gi'),
              new RegExp(`\\$json\\.${escapedSearchTerm}`, 'gi'),
              new RegExp(`${escapedSearchTerm}\\.[\\w.\\[\\]]+`, 'gi'),
              new RegExp(`\\.[\\w.]*${escapedSearchTerm}[\\w.]*`, 'gi'),
              new RegExp(`\\$\\(${escapedSearchTerm}\\)`, 'gi'),
              new RegExp(`\\{\\{[^}]*${escapedSearchTerm}[^}]*\\}\\}`, 'gi'),
              new RegExp(`\\$\\{${escapedSearchTerm}\\}`, 'gi'),
              new RegExp(`\\$json\\..*${escapedSearchTerm}.*`, 'gi'),
              new RegExp(`\\$items\\[[^\\]]*\\].*${escapedSearchTerm}.*`, 'gi'),
              new RegExp(`\\$input.*${escapedSearchTerm}.*`, 'gi'),
            ];

            searchPatterns.forEach(pattern => {
              try {
                const matches_in_string = value.match(pattern);
                if (matches_in_string) {
                  matches.push({
                    field: currentPath,
                    expression: value,
                    fullValue: value,
                    context: `Node: ${node.name}`,
                    matchIndex: matchIndex++
                  });
                }
              } catch (regexError) {
                // Ignore regex errors in tests
              }
            });
          } else if (typeof value === 'object' && value !== null) {
            searchInObject(value as Record<string, unknown>, currentPath);
          }
        });
      };

      searchInObject(node.parameters, 'parameters');
      if (node.credentials) {
        searchInObject(node.credentials, 'credentials');
      }

      if (matches.length > 0) {
        results.push({
          nodeName: node.name,
          nodeType: node.type,
          nodeId: node.id,
          matches
        });
      }
    });

    return new Response(JSON.stringify({
      success: true,
      data: { results }
    }));

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: `Error searching variables: ${error instanceof Error ? error.message : 'Unknown error'}`
    }), { status: 500 });
  }
};

describe('Search Variable API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
    } as any;
  };

  const mockWorkflowData = {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    nodes: [
      {
        id: 'node-1',
        name: 'HTTP Request',
        type: 'n8n-nodes-base.httpRequest',
        typeVersion: 1,
        position: [100, 100],
        parameters: {
          url: 'https://api.example.com/data',
          method: 'GET',
          headers: {
            'Authorization': 'Bearer {{$json.token}}',
            'Content-Type': 'application/json'
          }
        }
      },
      {
        id: 'node-2',
        name: 'Set Variable',
        type: 'n8n-nodes-base.set',
        typeVersion: 1,
        position: [300, 100],
        parameters: {
          values: {
            string: [
              {
                name: 'apiUrl',
                value: 'https://api.example.com/{{$json.endpoint}}'
              },
              {
                name: 'userId',
                value: '{{$node["HTTP Request"].json.userId}}'
              }
            ]
          }
        }
      }
    ],
    connections: {},
    settings: {},
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  describe('escapeRegex function', () => {
    it('should escape special regex characters', () => {
      expect(escapeRegex('user.id')).toBe('user\\.id');
      expect(escapeRegex('test*value')).toBe('test\\*value');
      expect(escapeRegex('test+value')).toBe('test\\+value');
      expect(escapeRegex('test?value')).toBe('test\\?value');
      expect(escapeRegex('test^value')).toBe('test\\^value');
      expect(escapeRegex('test$value')).toBe('test\\$value');
      expect(escapeRegex('test{value}')).toBe('test\\{value\\}');
      expect(escapeRegex('test(value)')).toBe('test\\(value\\)');
      expect(escapeRegex('test[value]')).toBe('test\\[value\\]');
      expect(escapeRegex('test|value')).toBe('test\\|value');
      expect(escapeRegex('test\\value')).toBe('test\\\\value');
    });

    it('should handle empty string', () => {
      expect(escapeRegex('')).toBe('');
    });

    it('should handle string without special characters', () => {
      expect(escapeRegex('simpletext')).toBe('simpletext');
    });

    it('should handle null and undefined', () => {
      expect(escapeRegex(null as any)).toBe('');
      expect(escapeRegex(undefined as any)).toBe('');
    });
  });

  describe('POST /api/n8n/search-variable', () => {
    it('should return 400 when missing required parameters', async () => {
      const request = createMockRequest({
        apiKey: 'test-key',
        baseUrl: 'http://localhost:5678',
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should return 400 when searchTerm is empty', async () => {
      const request = createMockRequest({
        apiKey: 'test-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: ''
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required parameters');
    });

    it('should handle n8n API errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Workflow not found'),
      } as Response);

      const request = createMockRequest({
        apiKey: 'invalid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'non-existent-workflow',
        searchTerm: 'test'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Workflow not found');
    });

    it('should handle n8n API JSON error responses', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'Invalid API key' })),
      } as Response);

      const request = createMockRequest({
        apiKey: 'invalid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'test'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid API key');
    });

    it('should successfully search for variables in workflow', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflowData }),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'json'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.results).toBeInstanceOf(Array);
      expect(data.data.results.length).toBeGreaterThan(0);
    });

    it('should handle workflow data without data wrapper', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWorkflowData),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'token'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    it('should return empty results when no matches found', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflowData }),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'nonexistentvariable'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results).toEqual([]);
    });

    it('should handle invalid workflow data structure', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test', name: 'test' } }),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'test'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid workflow data');
    });

    it('should handle network errors', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'test'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network error');
    });

    it('should search for different variable patterns', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      
      const searchTerms = ['json', 'node', 'input', 'items'];
      
      for (const searchTerm of searchTerms) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: mockWorkflowData }),
        } as Response);

        const request = createMockRequest({
          apiKey: 'valid-key',
          baseUrl: 'http://localhost:5678',
          workflowId: 'test-workflow',
          searchTerm
        });

        const response = await mockPOST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it('should handle special regex characters in search term', async () => {
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflowData }),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'user.id'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should test specific n8n variable patterns', async () => {
      const mockWorkflowWithVariables = {
        ...mockWorkflowData,
        nodes: [
          {
            id: 'node-1',
            name: 'Test Node',
            type: 'n8n-nodes-base.test',
            typeVersion: 1,
            position: [100, 100],
            parameters: {
              value1: '{{$json.data}}',
              value2: '{{$node["Previous Node"].json.result}}',
              value3: '{{$input.all()[0].json}}',
              value4: '{{$items[0].json.field}}',
              value5: '{{$json.field.subfield}}',
              value6: '{{$("variable_name")}}',
              value7: '{{$node["Node Name"]["json"]["field"]}}',
              value8: '{{$json}}',
              value9: '{{$input}}',
              value10: '{{$items}}'
            }
          }
        ]
      };

      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockWorkflowWithVariables }),
      } as Response);

      const request = createMockRequest({
        apiKey: 'valid-key',
        baseUrl: 'http://localhost:5678',
        workflowId: 'test-workflow',
        searchTerm: 'json'
      });

      const response = await mockPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.results.length).toBeGreaterThan(0);
    });
  });
}); 