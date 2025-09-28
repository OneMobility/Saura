"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client'; // Import the client for invoking edge function

interface AdminUserCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void; // Callback to refresh user list
}

const AdminUserCreateDialog: React.FC<AdminUserCreateDialogProps> = ({ isOpen, onClose, onUserCreated }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    username: '',
    role: 'user',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.email || !formData.password) {
      toast.error('Por favor, introduce un correo electrónico y una contraseña.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Invoke the Edge Function to create the user
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: JSON.stringify(formData),
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) {
        console.error('Error invoking create-admin-user function:', error);
        toast.error(`Error al crear el usuario: ${data?.error || error.message}`);
      } else {
        toast.success('Usuario creado con éxito.');
        onUserCreated(); // Refresh the user list
        onClose(); // Close the dialog
        setFormData({ // Reset form
          email: '',
          password: '',
          first_name: '',
          last_name: '',
          username: '',
          role: 'user',
        });
      }
    } catch (error: any) {
      console.error('Unexpected error during user creation:', error);
      toast.error(`Error inesperado: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Introduce los detalles para el nuevo usuario.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="first_name" className="text-right">
              Nombre
            </Label>
            <Input
              id="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="last_name" className="text-right">
              Apellido
            </Label>
            <Input
              id="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Nombre de Usuario
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={handleChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">
              Rol
            </Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AdminUserCreateDialog;