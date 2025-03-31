import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Home, Thermometer, Droplet, Users, DollarSign, CheckCircle, XCircle, Calendar, Search } from 'lucide-react';
import CallModal from '../CallModal/CallModal';
import './QualificationHistory.css';

const QualificationHistory = () => {
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [qualificationFilter, setQualificationFilter] = useState('all'); // 'all', 'qualified', 'not-qualified'
  const [dateFilter, setDateFilter] = useState('month'); // 'week', 'month', 'year'

  // Function to format Firebase timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firebase timestamp
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      // Convert to JavaScript Date
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    // If it's already a string or some other format
    return String(timestamp);
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        
        // Get current date information for filtering
        const now = new Date();
        let startDate;
        
        if (dateFilter === 'week') {
          // Start of current week (Sunday)
          const day = now.getDay();
          startDate = new Date(now);
          startDate.setDate(now.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'month') {
          // Start of current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateFilter === 'year') {
          // Start of current year
          startDate = new Date(now.getFullYear(), 0, 1);
        }
        
        const startTimestamp = Timestamp.fromDate(startDate);
        
        const leadsRef = collection(db, 'leads');
        const q = query(
          leadsRef,
          where('createdAt', '>=', startTimestamp),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const leadsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          leadsData.push(data);
        });
        
        setLeads(leadsData);
        setFilteredLeads(leadsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leads:', error);
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, [dateFilter]);
  
  // Update filtered leads when search query or qualification filter changes
  useEffect(() => {
    let filtered = [...leads];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lead => 
        (lead.name && lead.name.toLowerCase().includes(query)) ||
        (lead.phone && lead.phone.includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query))
      );
    }
    
    // Apply qualification filter
    if (qualificationFilter !== 'all') {
      const isQualified = qualificationFilter === 'qualified';
      filtered = filtered.filter(lead => lead.qualified === isQualified);
    }
    
    setFilteredLeads(filtered);
  }, [leads, searchQuery, qualificationFilter]);
  
  const openLeadModal = (lead) => {
    setSelectedLead(lead);
    setShowModal(true);
  };
  
  const closeLeadModal = () => {
    setShowModal(false);
    setSelectedLead(null);
  };
  
  // Function to get qualification status icon
  const getQualificationIcon = (lead) => {
    if (lead.qualified) {
      return <CheckCircle size={20} className="icon-qualified" />;
    } else {
      return <XCircle size={20} className="icon-not-qualified" />;
    }
  };

  return (
    <div className="qualification-history">
      <div className="dashboard-header">
        <h1>Lead Qualification History</h1>
        
        <div className="date-filter">
          <button 
            className={dateFilter === 'week' ? 'active' : ''} 
            onClick={() => setDateFilter('week')}
          >
            This Week
          </button>
          <button 
            className={dateFilter === 'month' ? 'active' : ''} 
            onClick={() => setDateFilter('month')}
          >
            This Month
          </button>
          <button 
            className={dateFilter === 'year' ? 'active' : ''} 
            onClick={() => setDateFilter('year')}
          >
            This Year
          </button>
        </div>
      </div>
      
      <div className="filter-controls">
        <div className="search-container">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Search by name, phone, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="qualification-filters">
          <button 
            className={qualificationFilter === 'all' ? 'active' : ''} 
            onClick={() => setQualificationFilter('all')}
          >
            All Leads
          </button>
          <button 
            className={qualificationFilter === 'qualified' ? 'active' : ''} 
            onClick={() => setQualificationFilter('qualified')}
          >
            Qualified
          </button>
          <button 
            className={qualificationFilter === 'not-qualified' ? 'active' : ''} 
            onClick={() => setQualificationFilter('not-qualified')}
          >
            Not Qualified
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      ) : (
        <div className="leads-table-container">
          {filteredLeads.length > 0 ? (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Date</th>
                  <th>Qualification Status</th>
                  <th>Home Owner</th>
                  <th>Heats with Oil</th>
                  <th>Used 500L+</th>
                  <th>Household Size</th>
                  <th>Income Level</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} onClick={() => openLeadModal(lead)}>
                    <td>
                      <div className="name-cell">
                        <div className="avatar">{lead.name?.charAt(0) || '?'}</div>
                        <div className="lead-info">
                          <span className="lead-name">{lead.name || 'Unknown'}</span>
                          <span className="lead-phone">{lead.phone || 'No phone'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatTimestamp(lead.callTimestamp)}</td>
                    <td>
                      <span className={`qualification-badge ${lead.qualified ? 'qualified' : 'not-qualified'}`}>
                        {getQualificationIcon(lead)}
                        {lead.qualified ? 'Qualified' : 'Not Qualified'}
                      </span>
                    </td>
                    <td className="answer-cell">
                      <span className={`answer-indicator ${lead.answers?.ownsHome === 'Yes' ? 'positive' : 'negative'}`}>
                        {lead.answers?.ownsHome || 'Unknown'}
                      </span>
                    </td>
                    <td className="answer-cell">
                      <span className={`answer-indicator ${lead.answers?.heatsWithOil === 'Yes' ? 'positive' : 'negative'}`}>
                        {lead.answers?.heatsWithOil || 'Unknown'}
                      </span>
                    </td>
                    <td className="answer-cell">
                      <span className={`answer-indicator ${lead.answers?.used500LOfOil === 'Yes' ? 'positive' : 'negative'}`}>
                        {lead.answers?.used500LOfOil || 'Unknown'}
                      </span>
                    </td>
                    <td>{lead.answers?.numberOfPeople || 'Unknown'}</td>
                    <td>{lead.answers?.householdIncome || 'Unknown'}</td>
                    <td>
                      <div className="summary-cell">
                        {lead.summary || 'No summary provided'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="no-results">
              <p>No leads found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
      
      {showModal && selectedLead && (
        <CallModal call={selectedLead} onClose={closeLeadModal} />
      )}
    </div>
  );
};

export default QualificationHistory;