import { z } from 'zod';
import { insertNewsSchema, news, registerUserSchema, users } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: registerUserSchema,
      responses: {
        201: z.object({
          user: z.custom<Omit<typeof users.$inferSelect, 'password'>>(),
          autoLogin: z.boolean(),
          message: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, 'password'>>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<Omit<typeof users.$inferSelect, 'password'>>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  news: {
    list: {
      method: 'GET' as const,
      path: '/api/news' as const,
      input: z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.string().optional(),
      }).optional(),
      responses: {
        200: z.object({
          items: z.array(z.custom<typeof news.$inferSelect>()),
          total: z.number(),
          page: z.number(),
          totalPages: z.number(),
        }),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/news/:id' as const,
      responses: {
        200: z.custom<typeof news.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/news/:id' as const,
      responses: {
        204: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    deleteByCategory: {
      method: "POST" as const,
      path: "/api/news/delete/category" as const,
      input: z.object({ category: z.string().min(1) }),
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    deleteByDate: {
      method: "POST" as const,
      path: "/api/news/delete/date" as const,
      input: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    fetchNow: {
      method: 'POST' as const,
      path: '/api/news/fetch' as const,
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    }
  },
  admin: {
    scrapeNow: {
      method: 'POST' as const,
      path: '/api/admin/scrape' as const,
      responses: {
        200: z.object({ message: z.string(), count: z.number() }),
        401: errorSchemas.unauthorized,
      },
    },
    pendingRequests: {
      method: "GET" as const,
      path: "/api/admin/requests/pending" as const,
      responses: {
        200: z.array(z.custom<Omit<typeof users.$inferSelect, "password">>()),
        401: errorSchemas.unauthorized,
      },
    },
    approveRequest: {
      method: "POST" as const,
      path: "/api/admin/requests/:id/approve" as const,
      responses: {
        200: z.object({
          message: z.string(),
          user: z.custom<Omit<typeof users.$inferSelect, "password">>(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    rejectRequest: {
      method: "POST" as const,
      path: "/api/admin/requests/:id/reject" as const,
      responses: {
        200: z.object({
          message: z.string(),
          user: z.custom<Omit<typeof users.$inferSelect, "password">>(),
        }),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
