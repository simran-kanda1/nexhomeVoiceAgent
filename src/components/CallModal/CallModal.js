import React, { useState } from 'react';
import { X, Download, User, Mail, Phone, Clock, Calendar, CheckCircle, XCircle, Home, Thermometer, Droplet, Users, DollarSign } from 'lucide-react';
import './CallModal.css';

const CallModal = ({ call, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');
  
  const formatDate = (dateString) => {
    try {
      // Handle Firebase Timestamp object
      if (dateString && typeof dateString === 'object' && dateString.seconds) {
        return new Date(dateString.seconds * 1000).toLocaleString();
      }
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString || 'N/A';
    }
  };
  
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };
  
  const handleDownloadRecording = () => {
    if (call.recordingUrl) {
      window.open(call.recordingUrl, '_blank');
    }
  };
  
  // Format transcript for better display
  const formatTranscript = (transcript) => {
    if (!transcript) return [];
    
    // Parse transcript into an array of {speaker, text} objects
    const lines = transcript.split('\n');
    const formattedTranscript = [];
    
    for (const line of lines) {
      if (line.trim() === '') continue;
      
      const speakerMatch = line.match(/^(Agent|User):/);
      if (speakerMatch) {
        const speaker = speakerMatch[1];
        const text = line.substring(speakerMatch[0].length).trim();
        formattedTranscript.push({ speaker, text });
      } else {
        // If no speaker prefix, add to the last message
        if (formattedTranscript.length > 0) {
          const lastEntry = formattedTranscript[formattedTranscript.length - 1];
          lastEntry.text += ' ' + line.trim();
        }
      }
    }
    
    return formattedTranscript;
  };
  
  // Extract call answers from the call data
  const getAnswers = (call) => {
    return {
      ownsHome: call.answers.ownsHome !== undefined ? String(call.answers.ownsHome) : 'N/A',
      heatsWithOil: call.answers.heatsWithOil !== undefined ? String(call.answers.heatsWithOil) : 'N/A',
      used500LOfOil: call.answers.used500LOfOil !== undefined ? String(call.answers.used500LOfOil) : 'N/A',
      numberOfPeople: call.answers.numberOfPeople || 'N/A',
      householdIncome: call.answers.householdIncome || 'N/A',
    };
  };
  
  const answers = getAnswers(call);
  const formattedTranscript = formatTranscript(call.transcript);
  
  return (
    <div className="modal-overlay">
      <div className="call-modal">
        <div className="modal-header">
          <h2>Call Details</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="contact-info">
          <div className="contact-avatar">
            {call.name ? call.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="contact-details">
            <h3>{call.name || 'Unknown'}</h3>
            <div className="contact-details-row">
              <div className="contact-detail">
                <Phone size={16} />
                <span>{call.phone || 'N/A'}</span>
              </div>
              <div className="contact-detail">
                <Mail size={16} />
                <span>{call.email || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="call-badges">
            <span className={`status-badge ${call.callStatus === 'completed' ? 'completed' : 'failed'}`}>
              {call.callStatus || 'Unknown'}
            </span>
            <span className={`qualification-badge ${call.qualified ? 'qualified' : 'not-qualified'}`}>
              {call.qualified ? 'Qualified' : 'Not Qualified'}
            </span>
          </div>
        </div>
        <div className="call-meta">
          <div className="meta-item">
            <Calendar size={16} />
            <div className="meta-content">
              <span className="meta-label">Date & Time</span>
              <span className="meta-value">{formatDate(call.callTimestamp)}</span>
            </div>
          </div>
          <div className="meta-item">
            <Clock size={16} />
            <div className="meta-content">
              <span className="meta-label">Duration</span>
              <span className="meta-value">{formatDuration(call.callDuration)}</span>
            </div>
          </div>
          <div className="meta-item">
            <div className="meta-content">
              <button className="download-button" onClick={handleDownloadRecording} disabled={!call.recordingUrl}>
                <Download size={16} />
                Download Recording
              </button>
            </div>
          </div>
        </div>
        
        <div className="modal-tabs">
          <button 
            className={activeTab === 'summary' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button 
            className={activeTab === 'transcript' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('transcript')}
          >
            Transcript
          </button>
          <button 
            className={activeTab === 'answers' ? 'tab-active' : ''} 
            onClick={() => setActiveTab('answers')}
          >
            Qualification Answers
          </button>
        </div>
        
        <div className="modal-content">
          {activeTab === 'summary' && (
            <div className="summary-tab">
              <h4>Call Summary</h4>
              <p>{call.summary || 'No summary available for this call.'}</p>
            </div>
          )}
          
          {activeTab === 'transcript' && (
            <div className="transcript-tab">
              <h4>Call Transcript</h4>
              {formattedTranscript.length > 0 ? (
                <div className="transcript-messages">
                  {formattedTranscript.map((message, index) => (
                    <div 
                      key={index} 
                      className={`transcript-message ${message.speaker.toLowerCase()}`}
                    >
                      <div className="message-speaker">
                        {message.speaker === 'Agent' ? 'AI Agent' : 'Customer'}
                      </div>
                      <div className="message-text">{message.text}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No transcript available for this call.</p>
              )}
            </div>
          )}
          
          {activeTab === 'answers' && (
            <div className="answers-tab">
              <h4>Qualification Questions</h4>
              <div className="answer-grid">
                <div className="answer-item">
                  <div className="answer-icon">
                    <Home size={20} />
                  </div>
                  <div className="answer-content">
                    <span className="answer-label">Owns Home</span>
                    <span className="answer-value">{answers.ownsHome}</span>
                  </div>
                </div>
                
                <div className="answer-item">
                  <div className="answer-icon">
                    <Thermometer size={20} />
                  </div>
                  <div className="answer-content">
                    <span className="answer-label">Heats with Oil</span>
                    <span className="answer-value">{answers.heatsWithOil}</span>
                  </div>
                </div>
                
                <div className="answer-item">
                  <div className="answer-icon">
                    <Droplet size={20} />
                  </div>
                  <div className="answer-content">
                    <span className="answer-label">Used 500L of Oil</span>
                    <span className="answer-value">{answers.used500LOfOil}</span>
                  </div>
                </div>
                
                <div className="answer-item">
                  <div className="answer-icon">
                    <Users size={20} />
                  </div>
                  <div className="answer-content">
                    <span className="answer-label">Number of People</span>
                    <span className="answer-value">{answers.numberOfPeople}</span>
                  </div>
                </div>
                
                <div className="answer-item">
                  <div className="answer-icon">
                    <DollarSign size={20} />
                  </div>
                  <div className="answer-content">
                    <span className="answer-label">Household Income</span>
                    <span className="answer-value">{answers.householdIncome}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;