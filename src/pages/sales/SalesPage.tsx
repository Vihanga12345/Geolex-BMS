import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { useERPAuth } from '@/contexts/ERPAuthContext';
import { 
  ArrowUpRight, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package, 
  Receipt, 
  RotateCcw,
  ShoppingBag
} from 'lucide-react';

const SalesPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useERPAuth();

  // Mock data for now - will be replaced with actual data later
  const summary = {
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    completedOrders: 0
  };

  const salesModules = [
    {
      title: 'Sales Orders',
      description: 'Create and manage sales orders',
      icon: ShoppingCart,
      path: '/sales/orders',
      color: 'bg-blue-500',
      count: summary.totalOrders
    },
    {
      title: 'Website Orders',
      description: 'Manage orders from e-commerce website',
      icon: ShoppingBag,
      path: '/sales/website-orders',
      color: 'bg-purple-500',
      count: 0 // This will be updated with actual count
    },
    {
      title: 'Customers',
      description: 'Manage customer information',
      icon: Users,
      path: '/sales/customers',
      color: 'bg-green-500',
      count: summary.totalCustomers
    },
    {
      title: 'Point of Sale',
      description: 'Quick sales processing',
      icon: Package,
      path: '/sales/pos',
      color: 'bg-orange-500',
      count: summary.totalProducts
    },
    {
      title: 'Sales Returns',
      description: 'Process returns and refunds',
      icon: RotateCcw,
      path: '/sales/returns',
      color: 'bg-red-500',
      count: 0
    },
    {
      title: 'Sales Reports',
      description: 'View detailed sales analytics',
      icon: Receipt,
      path: '/sales/reports',
      color: 'bg-indigo-500',
      count: summary.completedOrders
    }
  ];

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Module</h1>
            <p className="text-muted-foreground">
              Manage sales orders, customers, and handle returns
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {salesModules.map((module, index) => (
              <Card 
                key={index} 
                className="cursor-pointer hover:bg-muted/50 transition-colors border rounded-lg"
                onClick={() => navigate(module.path)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-medium">{module.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                    <div className="flex justify-center mt-2">
                      <module.icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SalesPage;
