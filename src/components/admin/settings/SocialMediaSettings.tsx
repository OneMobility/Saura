"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Facebook, Instagram, Save, Loader2 } from 'lucide-react';
import TikTokIcon from '@/components/icons/TikTokIcon'; // Import the new TikTokIcon

interface SocialLink {
  id?: string;
  platform: string;
  url: string;
}

const SocialMediaSettings = () => {
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultPlatforms = [
    { platform: 'facebook', icon: Facebook, label: 'Facebook' },
    { platform: 'instagram', icon: Instagram, label: 'Instagram' },
    { platform: 'tiktok', icon: TikTokIcon, label: 'TikTok' }, // Use TikTokIcon here
  ];

  useEffect(() => {
    fetchSocialLinks();
  }, []);

  const fetchSocialLinks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('social_media_links')
      .select('*');

    if (error) {
      console.error('Error fetching social media links:', error);
      toast.error('Error al cargar los enlaces de redes sociales.');
    } else {
      // Merge fetched data with default platforms to ensure all are displayed
      const mergedLinks = defaultPlatforms.map(dp => {
        const existingLink = data?.find(link => link.platform === dp.platform);
        return existingLink || { platform: dp.platform, url: '' };
      });
      setSocialLinks(mergedLinks);
    }
    setLoading(false);
  };

  const handleChange = (platform: string, value: string) => {
    setSocialLinks((prev) =>
      prev.map((link) => (link.platform === platform ? { ...link, url: value } : link))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    for (const link of socialLinks) {
      if (link.id) {
        // Update existing link
        const { error } = await supabase
          .from('social_media_links')
          .update({ url: link.url, updated_at: new Date().toISOString() })
          .eq('id', link.id);

        if (error) {
          console.error(`Error updating ${link.platform} link:`, error);
          toast.error(`Error al actualizar el enlace de ${link.platform}.`);
        }
      } else if (link.url) {
        // Insert new link if URL is provided
        const { error } = await supabase
          .from('social_media_links')
          .insert({ platform: link.platform, url: link.url });

        if (error) {
          console.error(`Error inserting ${link.platform} link:`, error);
          toast.error(`Error al guardar el enlace de ${link.platform}.`);
        }
      }
    }
    toast.success('Enlaces de redes sociales actualizados con éxito.');
    await fetchSocialLinks(); // Re-fetch to get new IDs if any were inserted
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <CardTitle className="mb-4">Configuración de Redes Sociales</CardTitle>
        <CardDescription>Cargando enlaces de redes sociales...</CardDescription>
        <Loader2 className="h-8 w-8 animate-spin text-rosa-mexicano mt-4" />
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Configuración de Redes Sociales</CardTitle>
        <CardDescription>Actualiza los enlaces a tus perfiles de redes sociales.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {defaultPlatforms.map((dp) => {
            const currentLink = socialLinks.find(link => link.platform === dp.platform);
            return (
              <div key={dp.platform} className="flex items-center space-x-4">
                <dp.icon className="h-6 w-6 text-gray-700" />
                <div className="flex-grow space-y-2">
                  <Label htmlFor={dp.platform}>{dp.label}</Label>
                  <Input
                    id={dp.platform}
                    type="url"
                    value={currentLink?.url || ''}
                    onChange={(e) => handleChange(dp.platform, e.target.value)}
                    placeholder={`URL de ${dp.label}`}
                  />
                </div>
              </div>
            );
          })}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Enlaces
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SocialMediaSettings;