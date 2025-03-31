import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Phone, Clock, CheckCircle, XCircle, Calendar, User, DollarSign, Home, Thermometer, Droplet, ChevronLeft, ChevronRight } from 'lucide-react';
import CallModal from '../CallModal/CallModal';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    minutesSaved: 0,
    leadsContacted: 0,
    qualifiedLeads: 0,
    callsThisMonth: 0,
  });
  const [selectedCall, setSelectedCall] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState('month'); // 'week', 'month', 'year'
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Function to navigate to previous period
  const goToPreviousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (dateFilter === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (dateFilter === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (dateFilter === 'year') {
      newDate.setFullYear(newDate.getFullYear() - 1);
    }
    setSelectedDate(newDate);
  };

  // Function to navigate to next period
  const goToNextPeriod = () => {
    const newDate = new Date(selectedDate);
    const today = new Date();
    
    if (dateFilter === 'week') {
      newDate.setDate(newDate.getDate() + 7);
      // Don't go into the future
      if (newDate > today) return;
    } else if (dateFilter === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
      // Don't go into the future
      if (newDate.getFullYear() > today.getFullYear() || 
          (newDate.getFullYear() === today.getFullYear() && newDate.getMonth() > today.getMonth())) return;
    } else if (dateFilter === 'year') {
      newDate.setFullYear(newDate.getFullYear() + 1);
      // Don't go into the future
      if (newDate.getFullYear() > today.getFullYear()) return;
    }
    setSelectedDate(newDate);
  };

  // Get display text for current period
  const getPeriodDisplayText = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (dateFilter === 'week') {
      // Start of selected week (Sunday)
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(selectedDate.getDate() - day);
      
      // End of selected week (Saturday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.getDate()} ${months[startOfWeek.getMonth()]} - ${endOfWeek.getDate()} ${months[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
    } else if (dateFilter === 'month') {
      return `${months[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else if (dateFilter === 'year') {
      return selectedDate.getFullYear().toString();
    }
    
    return '';
  };

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        
        // Get current date information for filtering
        let startDate, endDate;
        
        if (dateFilter === 'week') {
          // Start of selected week (Sunday)
          const day = selectedDate.getDay();
          startDate = new Date(selectedDate);
          startDate.setDate(selectedDate.getDate() - day);
          startDate.setHours(0, 0, 0, 0);
          
          // End of selected week (Saturday)
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 7);
          endDate.setHours(0, 0, 0, 0);
        } else if (dateFilter === 'month') {
          // Start of selected month
          startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          
          // End of selected month
          endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
        } else if (dateFilter === 'year') {
          // Start of selected year
          startDate = new Date(selectedDate.getFullYear(), 0, 1);
          
          // End of selected year
          endDate = new Date(selectedDate.getFullYear(), 11, 31);
          endDate.setHours(23, 59, 59, 999);
        }
        
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);
        
        const leadsRef = collection(db, 'leads');
        const q = query(
          leadsRef,
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const leadsData = [];
        
        let totalMinutes = 0;
        let qualifiedCount = 0;
        
        querySnapshot.forEach((doc) => {
          const data = { id: doc.id, ...doc.data() };
          leadsData.push(data);
          
          // Calculate total minutes
          if (data.callDuration) {
            totalMinutes += data.callDuration / 60; // Convert seconds to minutes
          }
          
          // Count qualified leads
          if (data.qualified) {
            qualifiedCount++;
          }
        });
        
        setLeads(leadsData);
        setStats({
          minutesSaved: Math.round(totalMinutes * 10) / 10, // Round to 1 decimal place
          leadsContacted: leadsData.length,
          qualifiedLeads: qualifiedCount,
          callsThisMonth: leadsData.length,
        });
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching leads:', error);
        setLoading(false);
      }
    };
    
    fetchLeads();
  }, [dateFilter, selectedDate]);
  
  const openCallModal = (call) => {
    setSelectedCall(call);
    setShowModal(true);
  };
  
  const closeCallModal = () => {
    setShowModal(false);
    setSelectedCall(null);
  };
  
  // Data for qualification rate chart
  const qualificationRateData = [
    { name: 'Qualified', value: stats.qualifiedLeads },
    { name: 'Not Qualified', value: stats.leadsContacted - stats.qualifiedLeads },
  ];
  
  const COLORS = ['#10b981', '#ef4444'];
  
  // Get data for bar chart based on time period
  const getChartData = () => {
    if (dateFilter === 'week') {
      // For week view: show calls by day of week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const callsByDay = Array(7).fill(0);
      
      // Find the start of the selected week (Sunday)
      const startOfWeek = new Date(selectedDate);
      const day = startOfWeek.getDay();
      startOfWeek.setDate(selectedDate.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      
      leads.forEach(lead => {
        if (lead.callTimestamp) {
          const callDate = lead.callTimestamp.seconds ? 
            new Date(lead.callTimestamp.seconds * 1000) : 
            new Date(lead.callTimestamp);
          
          // Check if the call falls within the selected week
          const callDay = callDate.getDay();
          callsByDay[callDay]++;
        }
      });
      
      return days.map((day, index) => ({
        label: day,
        value: callsByDay[index],
      }));
    } else if (dateFilter === 'month') {
      // For month view: show calls by day of month
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const callsByDay = Array(daysInMonth).fill(0);
      
      leads.forEach(lead => {
        if (lead.callTimestamp) {
          const callDate = lead.callTimestamp.seconds ? 
            new Date(lead.callTimestamp.seconds * 1000) : 
            new Date(lead.callTimestamp);
          
          // Check if the call is in the selected month
          if (callDate.getMonth() === month && callDate.getFullYear() === year) {
            const dayOfMonth = callDate.getDate() - 1; // Arrays are zero-indexed
            callsByDay[dayOfMonth]++;
          }
        }
      });
      
      return Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => ({
        label: day.toString(),
        value: callsByDay[day - 1],
      }));
    } else if (dateFilter === 'year') {
      // For year view: show calls by month
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const callsByMonth = Array(12).fill(0);
      const year = selectedDate.getFullYear();
      
      leads.forEach(lead => {
        if (lead.callTimestamp) {
          const callDate = lead.callTimestamp.seconds ? 
            new Date(lead.callTimestamp.seconds * 1000) : 
            new Date(lead.callTimestamp);
          
          if (callDate.getFullYear() === year) {
            const monthIndex = callDate.getMonth();
            callsByMonth[monthIndex]++;
          }
        }
      });
      
      return months.map((month, index) => ({
        label: month,
        value: callsByMonth[index],
      }));
    }
    
    return [];
  };
  
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Nexhome AI Leads Agent Dashboard</h1>
        
        <div className="date-filter">
          <button 
            className={dateFilter === 'week' ? 'active' : ''} 
            onClick={() => {
              setDateFilter('week');
              setSelectedDate(new Date()); // Reset to current date when changing views
            }}
          >
            Week
          </button>
          <button 
            className={dateFilter === 'month' ? 'active' : ''} 
            onClick={() => {
              setDateFilter('month');
              setSelectedDate(new Date());
            }}
          >
            Month
          </button>
          <button 
            className={dateFilter === 'year' ? 'active' : ''} 
            onClick={() => {
              setDateFilter('year');
              setSelectedDate(new Date());
            }}
          >
            Year
          </button>
        </div>
      </div>
      
      <div className="period-navigation">
        <button onClick={goToPreviousPeriod}>
          <ChevronLeft size={18} />
          Previous
        </button>
        <span className="current-period">{getPeriodDisplayText()}</span>
        <button 
          onClick={goToNextPeriod}
          disabled={dateFilter === 'week' && selectedDate >= new Date(new Date().setDate(new Date().getDate() - 7)) ||
                   dateFilter === 'month' && selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear() ||
                   dateFilter === 'year' && selectedDate.getFullYear() === new Date().getFullYear()}
        >
          Next
          <ChevronRight size={18} />
        </button>
      </div>
      
      {loading ? (
        <div className="loading-spinner">
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-icon">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <h3>Minutes Saved</h3>
                <p>{stats.minutesSaved}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Phone size={24} />
              </div>
              <div className="stat-content">
                <h3>Leads Contacted</h3>
                <p>{stats.leadsContacted}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <CheckCircle size={24} />
              </div>
              <div className="stat-content">
                <h3>Qualified Leads</h3>
                <p>{stats.qualifiedLeads}</p>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-icon">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <h3>Calls {dateFilter === 'week' ? 'This Week' : dateFilter === 'month' ? 'This Month' : 'This Year'}</h3>
                <p>{stats.callsThisMonth}</p>
              </div>
            </div>
          </div>
          
          <div className="dashboard-charts">
            <div className="chart-container">
              <h3>
                {dateFilter === 'week' ? 'Calls by Day of Week' : 
                 dateFilter === 'month' ? 'Calls by Day of Month' : 
                 'Calls by Month'}
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Calls" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="chart-container">
              <h3>Qualification Rate</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={qualificationRateData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {qualificationRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="recent-calls">
            <div className="section-header">
              <h3>Recent Calls</h3>
              <button className="view-all-btn" onClick={() => navigate('/calls')}>View All</button>
            </div>
            
            <div className="calls-table-container">
              <table className="calls-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Date & Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Qualification</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 5).map((lead) => (
                    <tr key={lead.id} onClick={() => openCallModal(lead)}>
                      <td>
                        <div className="name-cell">
                          <div className="avatar">{lead.name?.charAt(0) || '?'}</div>
                          <span>{lead.name || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>{formatTimestamp(lead.callTimestamp)}</td>
                      <td>{lead.callDuration ? `${Math.floor(lead.callDuration / 60)}:${String(lead.callDuration % 60).padStart(2, '0')}` : 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${lead.callStatus === 'completed' ? 'completed' : 'failed'}`}>
                          {lead.callStatus || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <span className={`qualification-badge ${lead.qualified ? 'qualified' : 'not-qualified'}`}>
                          {lead.qualified ? 'Qualified' : 'Not Qualified'}
                        </span>
                      </td>
                      <td>
                        <button className="view-btn" onClick={(e) => {
                          e.stopPropagation();
                          openCallModal(lead);
                        }}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {showModal && selectedCall && (
            <CallModal call={selectedCall} onClose={closeCallModal} />
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;