import { supabase } from '../lib/supabaseClient';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'pending' | 'active' | 'paused' | 'completed' | 'rejected';
  start_date: string;
  end_date: string;
  budget: number;
  daily_budget?: number;
  total_slots: number;
  total_cost: number;
  kiosk_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  target_locations?: string[];
  target_demographics?: any;
  total_spent?: number;
  impressions?: number;
  clicks?: number;
}

export interface Kiosk {
  id: string;
  name: string;
  location: string;
  address: string;
  city: string;
  state: string;
  traffic_level: 'low' | 'medium' | 'high';
  base_rate: number;
  price: number;
  status: 'active' | 'inactive' | 'maintenance';
  coordinates: {
    lat: number;
    lng: number;
  };
  description?: string;
  created_at: string;
  updated_at: string;
}

export class CampaignService {
  static async getUserCampaigns(userId: string): Promise<Campaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          kiosks:kiosk_campaigns(kiosk_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(campaign => ({
        id: campaign.id,
        name: campaign.name || `Campaign ${new Date(campaign.start_date).toLocaleDateString()} - ${new Date(campaign.end_date).toLocaleDateString()}`,
        description: campaign.description,
        status: campaign.status,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        budget: campaign.budget,
        daily_budget: campaign.daily_budget,
        total_slots: campaign.total_slots || 0,
        total_cost: campaign.total_cost || 0,
        kiosk_count: campaign.kiosks?.length || 0,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        user_id: campaign.user_id,
        target_locations: campaign.target_locations,
        target_demographics: campaign.target_demographics,
        total_spent: campaign.total_spent,
        impressions: campaign.impressions,
        clicks: campaign.clicks
      })) || [];
    } catch (error) {
      console.error('Error fetching user campaigns:', error);
      return [];
    }
  }

  static async getAvailableKiosks(): Promise<Kiosk[]> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching available kiosks:', error);
      return [];
    }
  }

  static async getKioskById(kioskId: string): Promise<Kiosk | null> {
    try {
      const { data, error } = await supabase
        .from('kiosks')
        .select('*')
        .eq('id', kioskId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error fetching kiosk:', error);
      return null;
    }
  }

  static async createCampaign(campaignData: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    budget: number;
    daily_budget?: number;
    total_slots: number;
    total_cost: number;
    user_id: string;
    kiosk_ids: string[];
    target_locations?: string[];
    target_demographics?: any;
    media_asset_id?: string;
  }): Promise<Campaign | null> {
    try {
      // Start a transaction
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          name: campaignData.name,
          description: campaignData.description,
          start_date: campaignData.start_date,
          end_date: campaignData.end_date,
          budget: campaignData.budget,
          daily_budget: campaignData.daily_budget,
          total_slots: campaignData.total_slots,
          total_cost: campaignData.total_cost,
          user_id: campaignData.user_id,
          target_locations: campaignData.target_locations,
          target_demographics: campaignData.target_demographics,
          status: 'pending'
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create kiosk-campaign relationships
      if (campaignData.kiosk_ids.length > 0) {
        const kioskCampaigns = campaignData.kiosk_ids.map(kioskId => ({
          campaign_id: campaign.id,
          kiosk_id: kioskId
        }));

        const { error: kioskError } = await supabase
          .from('kiosk_campaigns')
          .insert(kioskCampaigns);

        if (kioskError) throw kioskError;
      }

      // Link media asset to campaign if provided
      if (campaignData.media_asset_id) {
        const { error: mediaError } = await supabase
          .from('campaign_media')
          .insert({
            campaign_id: campaign.id,
            media_id: campaignData.media_asset_id,
            display_order: 0,
            weight: 1
          });

        if (mediaError) throw mediaError;

        // Update media asset with campaign ID
        const { error: updateMediaError } = await supabase
          .from('media_assets')
          .update({ 
            campaign_id: campaign.id,
            status: 'approved'
          })
          .eq('id', campaignData.media_asset_id);

        if (updateMediaError) throw updateMediaError;
      }

      return campaign;
    } catch (error) {
      console.error('Error creating campaign:', error);
      return null;
    }
  }

  static async updateCampaignStatus(campaignId: string, status: Campaign['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', campaignId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error updating campaign status:', error);
      return false;
    }
  }
}

