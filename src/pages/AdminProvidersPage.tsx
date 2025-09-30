"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate } from 'react-router-dom';
import { Loader2, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Provider {
  id: string;
  name: string;
  service_type: string;
  cost_per_unit: number;
  unit_type: string;
  selling_price_per_unit: number;
  is_active: boolean;
  created_at: string;
}

const AdminProvidersPage = () => {
  const { user, isAdmin, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force re-fetch of providers

  useEffect(() => {
    if (!sessionLoading && (!user || !isAdmin)) {
      navigate('/login');
    } else if (!sessionLoading && user && isAdmin) {
      fetchProviders();
    }
  }, [user, isAdmin, sessionLoading, navigate, refreshKey]);

  const fetchProviders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching providers:', error);
      toast.error('Error al cargar la lista de proveedores.');
    } else {
      setProviders(data || []);
    }
    setLoading(false);
  };

  const handleAddProvider = () => {
    navigate('/admin/providers/new');
  };

  const handleEditProvider = (provider: Provider) => {
    navigate(`/admin/providers/edit/${provider.id}`);
  };

  const handleDeleteProvider = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este proveedor?')) {
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting provider:', error);
      toast.error('Error al eliminar el proveedor.');
    } else {
      toast.success('Proveedor eliminado con éxito.');
      setRefreshKey(prev => prev + 1);
    }
    setLoading(false);
  };

  if (sessionLoading || (user && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-rosa-mexicano" />
        <p className="ml-4 text-gray-700">Cargando proveedores...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-grow">
        <AdminHeader pageTitle="Gestión de Proveedores">
          <Button onClick={handleAddProvider} className="bg-rosa-mexicano hover:bg-rosa-mexicano/90 text-white">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Proveedor
          </Button>
        </AdminHeader>
        <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Proveedores Registrados</h2>
            {providers.length === 0 ? (
              <p className="text-gray-600">No hay proveedores registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo de Servicio</TableHead>
                      <TableHead>Costo por Unidad</TableHead>
                      <TableHead>Tipo de Unidad</TableHead>
                      <TableHead>Precio Venta por Unidad</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">{provider.name}</TableCell>
                        <TableCell>{provider.service_type}</TableCell>
                        <TableCell>${provider.cost_per_unit.toFixed(2)}</TableCell>
                        <TableCell>{provider.unit_type}</TableCell>
                        <TableCell>${provider.selling_price_per_unit.toFixed(2)}</TableCell>
                        <TableCell>{provider.is_active ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditProvider(provider)}
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
        <footer className="bg-gray-800 text-white py-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Saura Tours Admin. Todos los derechos reservados.</p>
        </footer>
      </div>
    </div>
  );
};

export default AdminProvidersPage;