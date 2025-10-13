import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import { getAllProjects, saveProject, deleteProject } from '../utils/projectDB';

const LandingPage = ({ onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    type: '',
    description: ''
  });

  // Load projects from IndexedDB on mount
  useEffect(() => {
    getAllProjects().then(setProjects);
  }, []);

  // Filter projects based on search term
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle creating a new project
  const handleCreateProject = () => {
    if (!newProject.name.trim()) {
      alert('Project name is required');
      return;
    }

    const project = {
      id: Date.now().toString(),
      name: newProject.name.trim(),
      type: newProject.type.trim(),
      description: newProject.description.trim(),
      createdAt: new Date().toISOString(),
      items: [] // folders/files will be stored here
    };

    saveProject(project).then(() => {
      getAllProjects().then(setProjects);
    });

    setNewProject({ name: '', type: '', description: '' });
    setShowModal(false);
  };

  // Handle project selection
  const handleProjectSelect = (project) => {
    onProjectSelect(project);
  };

  // Delete a project by id
  const handleDeleteProject = (id) => {
    deleteProject(id).then(() => {
      getAllProjects().then(setProjects);
    });
  };

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <div className="landing-nav">
        <div className="nav-logo">
          <h2>DOC-UI</h2>
        </div>
        <div className="nav-buttons">
          <button className="nav-btn secondary" onClick={() => setShowModal(true)}>
            Create Project
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="hero-section">
        <h1 className="hero-title">Document Processing Made Simple</h1>
        {/* <p className="hero-description">
          Welcome to DOC-UI – your trusted platform for comprehensive document processing solutions. 
          Transform your PDFs, create dynamic forms, and manage projects with our easy-to-use interface.
        </p> */}
        
        <div className="hero-buttons">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="hero-search"
            />
            <button className="search-btn-hero">
              Search
            </button>
          </div>
          <button className="hero-btn primary" onClick={() => setShowModal(true)}>
            Get Started
          </button>
        </div>
      </div>

      {/* Projects Section */}
      <div className="projects-section">
        {filteredProjects.length === 0 ? (
          <div className="no-projects">
            <p>No projects found. Create your first project to get started!</p>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map(project => (
              <div
                key={project.id}
                className="project-card"
                onClick={() => handleProjectSelect(project)}
              >
                <h3>{project.name}</h3>
                <p className="project-type">{project.type}</p>
                <p className="project-description">{project.description}</p>
                <p className="project-date">
                  Created: {new Date(project.createdAt).toLocaleDateString()}
                </p>
                <button
                  className="delete-btn"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                >Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Project</h2>
            <form onSubmit={(e) => { e.preventDefault(); handleCreateProject(); }}>
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Project Type</label>
                <input
                  type="text"
                  placeholder="e.g., Insurance, Legal, Finance"
                  value={newProject.type}
                  onChange={(e) => setNewProject({...newProject, type: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  placeholder="Describe your project..."
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit">Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
