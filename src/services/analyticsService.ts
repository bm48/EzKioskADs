import { supabase } from '../lib/supabaseClient';
import { AnalyticsEvent, Inserts } from '../types/database';

export class AnalyticsService {
  // Track an analytics event
  static async trackEvent(eventData: Inserts<'analytics_events'>): Promise<AnalyticsEvent> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to track event: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      throw error;
    }
  }

  // Track impression
  static async trackImpression(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'impression',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track click
  static async trackClick(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'click',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track video play
  static async trackVideoPlay(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'play',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Track video completion
  static async trackVideoComplete(
    campaignId: string,
    mediaId: string,
    location: string,
    deviceInfo: Record<string, any> = {},
    userAgent?: string,
    ipAddress?: string
  ): Promise<AnalyticsEvent> {
    const eventData: Inserts<'analytics_events'> = {
      campaign_id: campaignId,
      media_id: mediaId,
      event_type: 'complete',
      location,
      device_info: deviceInfo,
      user_agent: userAgent,
      ip_address: ipAddress
    };

    return this.trackEvent(eventData);
  }

  // Get campaign analytics summary
  static async getCampaignAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    ctr: number;
    playRate: number;
    completionRate: number;
    totalEvents: number;
  }> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch campaign analytics: ${error.message}`);
      }

      const impressions = events?.filter(e => e.event_type === 'impression').length || 0;
      const clicks = events?.filter(e => e.event_type === 'click').length || 0;
      const plays = events?.filter(e => e.event_type === 'play').length || 0;
      const completions = events?.filter(e => e.event_type === 'complete').length || 0;
      const totalEvents = events?.length || 0;

      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const playRate = impressions > 0 ? (plays / impressions) * 100 : 0;
      const completionRate = plays > 0 ? (completions / plays) * 100 : 0;

      return {
        impressions,
        clicks,
        plays,
        completions,
        ctr,
        playRate,
        completionRate,
        totalEvents
      };
    } catch (error) {
      console.error('Error getting campaign analytics:', error);
      throw error;
    }
  }

  // Get analytics by time period
  static async getAnalyticsByTimePeriod(
    campaignId: string,
    period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily',
    days: number = 30
  ): Promise<Array<{
    period: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
  }>> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch analytics by time period: ${error.message}`);
      }

      // Group events by time period
      const analyticsByPeriod = new Map<string, {
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
      }>();

      events?.forEach(event => {
        let periodKey: string;
        const eventDate = new Date(event.timestamp);

        switch (period) {
          case 'hourly':
            periodKey = eventDate.toISOString().slice(0, 13); // YYYY-MM-DDTHH
            break;
          case 'daily':
            periodKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'weekly':
            const weekStart = new Date(eventDate);
            weekStart.setDate(eventDate.getDate() - eventDate.getDay());
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          case 'monthly':
            periodKey = eventDate.toISOString().slice(0, 7); // YYYY-MM
            break;
          default:
            periodKey = eventDate.toISOString().split('T')[0];
        }

        const current = analyticsByPeriod.get(periodKey) || {
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0
        };

        switch (event.event_type) {
          case 'impression':
            current.impressions++;
            break;
          case 'click':
            current.clicks++;
            break;
          case 'play':
            current.plays++;
            break;
          case 'complete':
            current.completions++;
            break;
        }

        analyticsByPeriod.set(periodKey, current);
      });

      // Convert to array and sort
      const result = Array.from(analyticsByPeriod.entries()).map(([period, data]) => ({
        period,
        ...data
      }));

      return result.sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error getting analytics by time period:', error);
      throw error;
    }
  }

  // Get location-based analytics
  static async getLocationAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    location: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('location, event_type')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch location analytics: ${error.message}`);
      }

      // Group events by location
      const locationAnalytics = new Map<string, {
        impressions: number;
        clicks: number;
      }>();

      events?.forEach(event => {
        const current = locationAnalytics.get(event.location) || {
          impressions: 0,
          clicks: 0
        };

        if (event.event_type === 'impression') {
          current.impressions++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }

        locationAnalytics.set(event.location, current);
      });

      // Convert to array and calculate CTR
      const result = Array.from(locationAnalytics.entries()).map(([location, data]) => ({
        location,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting location analytics:', error);
      throw error;
    }
  }

  // Get device analytics
  static async getDeviceAnalytics(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    deviceType: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select('device_info, event_type')
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch device analytics: ${error.message}`);
      }

      // Group events by device type
      const deviceAnalytics = new Map<string, {
        impressions: number;
        clicks: number;
      }>();

      events?.forEach(event => {
        const deviceType = this.getDeviceType(event.device_info);
        const current = deviceAnalytics.get(deviceType) || {
          impressions: 0,
          clicks: 0
        };

        if (event.event_type === 'impression') {
          current.impressions++;
        } else if (event.event_type === 'click') {
          current.clicks++;
        }

        deviceAnalytics.set(deviceType, current);
      });

      // Convert to array and calculate CTR
      const result = Array.from(deviceAnalytics.entries()).map(([deviceType, data]) => ({
        deviceType,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting device analytics:', error);
      throw error;
    }
  }

  // Get media performance comparison
  static async getMediaPerformanceComparison(
    campaignId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    mediaId: string;
    mediaName: string;
    impressions: number;
    clicks: number;
    plays: number;
    completions: number;
    ctr: number;
    playRate: number;
    completionRate: number;
  }>> {
    try {
      let query = supabase
        .from('analytics_events')
        .select(`
          media_id,
          event_type,
          media_assets!inner(file_name)
        `)
        .eq('campaign_id', campaignId);

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data: events, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch media performance: ${error.message}`);
      }

      // Group events by media
      const mediaPerformance = new Map<string, {
        mediaName: string;
        impressions: number;
        clicks: number;
        plays: number;
        completions: number;
      }>();

      events?.forEach(event => {
        const mediaId = event.media_id;
        const mediaName = (event.media_assets as any)?.file_name || 'Unknown';
        
        const current = mediaPerformance.get(mediaId) || {
          mediaName,
          impressions: 0,
          clicks: 0,
          plays: 0,
          completions: 0
        };

        switch (event.event_type) {
          case 'impression':
            current.impressions++;
            break;
          case 'click':
            current.clicks++;
            break;
          case 'play':
            current.plays++;
            break;
          case 'complete':
            current.completions++;
            break;
        }

        mediaPerformance.set(mediaId, current);
      });

      // Convert to array and calculate rates
      const result = Array.from(mediaPerformance.entries()).map(([mediaId, data]) => ({
        mediaId,
        ...data,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        playRate: data.impressions > 0 ? (data.plays / data.impressions) * 100 : 0,
        completionRate: data.plays > 0 ? (data.completions / data.plays) * 100 : 0
      }));

      return result.sort((a, b) => b.impressions - a.impressions);
    } catch (error) {
      console.error('Error getting media performance comparison:', error);
      throw error;
    }
  }

  // Get real-time analytics (last hour)
  static async getRealTimeAnalytics(campaignId: string): Promise<{
    lastHour: {
      impressions: number;
      clicks: number;
      plays: number;
      completions: number;
    };
    last24Hours: {
      impressions: number;
      clicks: number;
      plays: number;
      completions: number;
    };
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get last hour data
      const { data: lastHourEvents, error: lastHourError } = await supabase
        .from('analytics_events')
        .select('event_type')
        .eq('campaign_id', campaignId)
        .gte('timestamp', oneHourAgo.toISOString());

      if (lastHourError) {
        throw new Error(`Failed to fetch last hour analytics: ${lastHourError.message}`);
      }

      // Get last 24 hours data
      const { data: last24HoursEvents, error: last24HoursError } = await supabase
        .from('analytics_events')
        .select('event_type')
        .eq('campaign_id', campaignId)
        .gte('timestamp', oneDayAgo.toISOString());

      if (last24HoursError) {
        throw new Error(`Failed to fetch last 24 hours analytics: ${last24HoursError.message}`);
      }

      const calculateMetrics = (events: any[]) => ({
        impressions: events?.filter(e => e.event_type === 'impression').length || 0,
        clicks: events?.filter(e => e.event_type === 'click').length || 0,
        plays: events?.filter(e => e.event_type === 'play').length || 0,
        completions: events?.filter(e => e.event_type === 'complete').length || 0
      });

      return {
        lastHour: calculateMetrics(lastHourEvents),
        last24Hours: calculateMetrics(last24HoursEvents)
      };
    } catch (error) {
      console.error('Error getting real-time analytics:', error);
      throw error;
    }
  }

  // Helper method to determine device type from device info
  private static getDeviceType(deviceInfo: Record<string, any>): string {
    if (!deviceInfo) return 'Unknown';

    const userAgent = deviceInfo.userAgent || '';
    const screenWidth = deviceInfo.screenWidth || 0;
    const screenHeight = deviceInfo.screenHeight || 0;

    if (userAgent.includes('Mobile') || screenWidth < 768) {
      return 'Mobile';
    } else if (userAgent.includes('Tablet') || (screenWidth >= 768 && screenWidth < 1024)) {
      return 'Tablet';
    } else {
      return 'Desktop';
    }
  }

  // Export analytics data
  static async exportAnalyticsData(
    campaignId: string,
    startDate: string,
    endDate: string,
    format: 'csv' | 'json' = 'json'
  ): Promise<string | object> {
    try {
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .gte('timestamp', startDate)
        .lte('timestamp', endDate)
        .order('timestamp', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch analytics data for export: ${error.message}`);
      }

      if (format === 'csv') {
        return this.convertToCSV(events || []);
      } else {
        return events || [];
      }
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      throw error;
    }
  }

  // Convert data to CSV format
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (typeof value === 'object') {
          return JSON.stringify(value);
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

