import { supabase } from '../lib/supabaseClient';

export interface BillingCampaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  total_cost: number;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: 'active' | 'cancelled' | 'paused';
  auto_renewal: boolean;
  start_date: string;
  end_date?: string;
  created_at: string;
  linked_campaigns: string[];
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  campaign_id: string;
  amount: number;
  status: 'succeeded' | 'pending' | 'failed' | 'refunded';
  description: string;
  payment_date: string;
  created_at: string;
}

export class BillingService {
  static async getActiveCampaigns(userId: string): Promise<BillingCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching active campaigns:', error);
      return [];
    }
  }

  static async getAllCampaigns(userId: string): Promise<BillingCampaign[]> {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return [];
    }
  }

  static async getSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          linked_campaigns:subscription_campaigns(campaign_id)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(subscription => ({
        id: subscription.id,
        user_id: subscription.user_id,
        status: subscription.status,
        auto_renewal: subscription.auto_renewal,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        created_at: subscription.created_at,
        linked_campaigns: subscription.linked_campaigns?.map((lc: any) => lc.campaign_id) || []
      })) || [];
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
  }

  static async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select(`
          *,
          campaigns(name)
        `)
        .eq('user_id', userId)
        .order('payment_date', { ascending: false });

      if (error) throw error;

      // Transform the data to match our interface
      return data?.map(payment => ({
        id: payment.id,
        user_id: payment.user_id,
        campaign_id: payment.campaign_id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description || (payment.campaigns?.name ? `Campaign: ${payment.campaigns.name}` : 'Campaign Payment'),
        payment_date: payment.payment_date,
        created_at: payment.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  static async createSubscription(userId: string, subscriptionData: {
    auto_renewal: boolean;
    start_date: string;
    end_date?: string;
  }): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          status: 'active',
          auto_renewal: subscriptionData.auto_renewal,
          start_date: subscriptionData.start_date,
          end_date: subscriptionData.end_date
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        status: data.status,
        auto_renewal: data.auto_renewal,
        start_date: data.start_date,
        end_date: data.end_date,
        created_at: data.created_at,
        linked_campaigns: []
      };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return null;
    }
  }

  static async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return false;
    }
  }

  static async createPaymentRecord(paymentData: {
    user_id: string;
    campaign_id: string;
    amount: number;
    status: 'succeeded' | 'pending' | 'failed';
    description?: string;
  }): Promise<PaymentHistory | null> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .insert([{
          user_id: paymentData.user_id,
          campaign_id: paymentData.campaign_id,
          amount: paymentData.amount,
          status: paymentData.status,
          description: paymentData.description,
          payment_date: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        campaign_id: data.campaign_id,
        amount: data.amount,
        status: data.status,
        description: data.description,
        payment_date: data.payment_date,
        created_at: data.created_at
      };
    } catch (error) {
      console.error('Error creating payment record:', error);
      return null;
    }
  }

  static async getBillingSummary(userId: string): Promise<{
    totalSpent: number;
    activeCampaigns: number;
    activeSubscriptions: number;
    monthlySpend: number;
  }> {
    try {
      const [campaigns, subscriptions, payments] = await Promise.all([
        this.getAllCampaigns(userId),
        this.getSubscriptions(userId),
        this.getPaymentHistory(userId)
      ]);

      const totalSpent = payments
        .filter(p => p.status === 'succeeded')
        .reduce((sum, payment) => sum + payment.amount, 0);

      const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;

      // Calculate monthly spend (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthlySpend = payments
        .filter(p => p.status === 'succeeded' && new Date(p.payment_date) >= thirtyDaysAgo)
        .reduce((sum, payment) => sum + payment.amount, 0);

      return {
        totalSpent,
        activeCampaigns,
        activeSubscriptions,
        monthlySpend
      };
    } catch (error) {
      console.error('Error fetching billing summary:', error);
      return {
        totalSpent: 0,
        activeCampaigns: 0,
        activeSubscriptions: 0,
        monthlySpend: 0
      };
    }
  }
}