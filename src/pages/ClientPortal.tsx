import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardHome from './DashboardHome';
import CampaignsPage from './CampaignsPage';
import NewCampaignPage from './NewCampaignPage';
import KioskSelectionPage from './KioskSelectionPage';
import SelectWeeksPage from './SelectWeeksPage';
import AddMediaDurationPage from './AddMediaDurationPage';
import ReviewSubmitPage from './ReviewSubmitPage';
import AnalyticsPage from './AnalyticsPage';
import BillingPage from './BillingPage';
import ProfilePage from './ProfilePage';
import HelpCenterPage from './HelpCenterPage';
import ContactPage from './ContactPage';
import KiosksPage from './KiosksPage';
import CampaignDetailsPage from './CampaignDetailsPage';

export default function ClientPortal() {
  return (
    <Routes>
      <Route path="/" element={<DashboardHome />} />
      <Route path="/campaigns" element={<CampaignsPage />} />
      <Route path="/campaigns/:id" element={<CampaignDetailsPage />} />
      <Route path="/new-campaign" element={<NewCampaignPage />} />
      <Route path="/kiosk-selection" element={<KioskSelectionPage />} />
      <Route path="/select-weeks" element={<SelectWeeksPage />} />
      <Route path="/add-media-duration" element={<AddMediaDurationPage />} />
      <Route path="/review-submit" element={<ReviewSubmitPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/billing" element={<BillingPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/kiosks" element={<KiosksPage />} />
    </Routes>
  );
}