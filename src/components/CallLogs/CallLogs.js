import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { Phone, Clock, Calendar, Download, Search, ArrowUp, ArrowDown } from 'lucide-react';
import CallModal from '../CallModal/CallModal';
import './CallLogs.css';

const CallLogs = () => {
  const [calls, setCalls] = useState([]);
  const [filteredCalls, setFilteredCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('month'); // 'week', 'month', 'year', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'failed'
  const [qualificationFilter, setQualificationFilter] = useState('all'); // 'all', 'qualified', 'not-qualified'
  const [sortField, setSortField] = useState('callTimestamp');
  const [sortDirection, setSortDirection] = useState('desc');

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

  // Fetch all calls once on component mount
  useEffect(() => {
    const fetchAllCalls = async () => {
      try {
        setLoading(true);
        const callsRef = collection(db, 'leads');
        const q = query(callsRef, orderBy('callTimestamp', 'desc'));
        
        const querySnapshot = await getDocs(q);
        let callsData = [];
        
        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          callsData.push(data);
        });
        
        setCalls(callsData);
        applyFilters(callsData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching calls:', error);
        setLoading(false);
      }
    };
    
    fetchAllCalls();
  }, []);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters(calls);
  }, [dateFilter, statusFilter, qualificationFilter, sortField, sortDirection, searchQuery, calls]);

  // Function to apply all filters
  const applyFilters = (callsData) => {
    if (!callsData.length) return;
    
    let filtered = [...callsData];
    
    // Apply date filter
    if (dateFilter !== 'all') {
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
      
      filtered = filtered.filter(call => {
        if (!call.callTimestamp) return false;
        const callDate = new Date(call.callTimestamp.seconds * 1000);
        return callDate >= startDate;
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(call => call.callStatus === statusFilter);
    }
    
    // Apply qualification filter
    if (qualificationFilter !== 'all') {
      const isQualified = qualificationFilter === 'qualified';
      filtered = filtered.filter(call => call.qualified === isQualified);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const lowerCaseQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(call => 
        (call.name && call.name.toLowerCase().includes(lowerCaseQuery)) ||
        (call.phone && call.phone.includes(lowerCaseQuery)) ||
        (call.email && call.email?.toLowerCase().includes(lowerCaseQuery))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle undefined values
      if (aValue === undefined) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === undefined) return sortDirection === 'asc' ? 1 : -1;
      
      // Special handling for timestamps
      if (sortField === 'callTimestamp') {
        aValue = aValue?.seconds || 0;
        bValue = bValue?.seconds || 0;
      }
      
      // Determine sort order
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredCalls(filtered);
  };
  
  const handleSearch = (e) => {
    if (e.key === 'Enter' || e.type === 'click' || e.type === 'change') {
      setSearchQuery(e.target.value);
    }
  };
  
  const openCallModal = (call) => {
    setSelectedCall(call);
    setShowModal(true);
  };
  
  const closeCallModal = () => {
    setShowModal(false);
    setSelectedCall(null);
  };
  
  const handleSort = (field) => {
    if (field === sortField) {
      // Toggle sort direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending order
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const renderSortIndicator = (field) => {
    if (field === sortField) {
      return sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    }
    return null;
  };

  const getTotalCallMinutes = () => {
    return Math.round(filteredCalls.reduce((total, call) => 
      total + (call.callDuration ? call.callDuration / 60 : 0), 0) * 10) / 10;
  };

  return (
    <div className="call-logs">
      <div className="page-header">
        <h1>Call Logs</h1>
        <div className="header-actions">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Search by name, phone, or email..." 
              value={searchQuery}
              onChange={handleSearch}
              onKeyUp={(e) => e.key === 'Enter' && handleSearch(e)}
            />
            <button className="search-button" onClick={handleSearch}>
              <Search size={16} />
            </button>
          </div>
          
          <div className="filter-container">
            <div className="filter-dropdown">
              <label>Date:</label>
              <select 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div className="filter-dropdown">
              <label>Status:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div className="filter-dropdown">
              <label>Qualification:</label>
              <select 
                value={qualificationFilter} 
                onChange={(e) => setQualificationFilter(e.target.value)}
              >
                <option value="all">All Leads</option>
                <option value="qualified">Qualified</option>
                <option value="not-qualified">Not Qualified</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon">
                <Phone size={24} />
              </div>
              <div className="stat-content">
                <h3>Total Calls</h3>
                <p>{filteredCalls.length}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <h3>Minutes on Calls</h3>
                <p>{getTotalCallMinutes()}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <h3>
                  Today's Date:
                </h3>
                <p>
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="calls-table-container">
            <table className="calls-table">
              <thead>
                <tr>
                  <th className="sortable" onClick={() => handleSort('name')}>
                    <div className="sort-header">
                      Name {renderSortIndicator('name')}
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('callTimestamp')}>
                    <div className="sort-header">
                      Date & Time {renderSortIndicator('callTimestamp')}
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('callDuration')}>
                    <div className="sort-header">
                      Duration {renderSortIndicator('callDuration')}
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('callStatus')}>
                    <div className="sort-header">
                      Status {renderSortIndicator('callStatus')}
                    </div>
                  </th>
                  <th className="sortable" onClick={() => handleSort('qualified')}>
                    <div className="sort-header">
                      Qualification {renderSortIndicator('qualified')}
                    </div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => (
                    <tr key={call.id} onClick={() => openCallModal(call)}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar">{call.name?.charAt(0) || '?'}</div>
                          <div className="name-details">
                            <span className="name-text">{call.name || 'Unknown'}</span>
                            {call.phone && <span className="phone-text">{call.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td>{formatTimestamp(call.callTimestamp)}</td>
                      <td>{call.callDuration ? `${Math.floor(call.callDuration / 60)}:${String(call.callDuration % 60).padStart(2, '0')}` : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${call.callStatus === 'completed' ? 'completed' : 'failed'}`}>
                          {call.callStatus || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`qualification-badge ${call.qualified ? 'qualified' : 'not-qualified'}`}>
                          {call.qualified ? 'Qualified' : 'Not Qualified'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="view-btn" onClick={(e) => {
                            e.stopPropagation();
                            openCallModal(call);
                          }}>
                            View
                          </button>
                          {call.recordingUrl && (
                            <button 
                              className="download-btn" 
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(call.recordingUrl, '_blank');
                              }}
                            >
                              <Download size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-results">
                      No calls found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {showModal && selectedCall && (
            <CallModal call={selectedCall} onClose={closeCallModal} />
          )}
        </>
      )}
    </div>
  );
};

export default CallLogs;