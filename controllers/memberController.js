import React, { useState, createContext, useContext } from 'react';

// --- Services et Contextes Mock (pour rendre le code autonome) ---
// Dans une application réelle, ces fichiers seraient séparés.

// Mock de AuthContext pour la démonstration
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);
const MockAuthProvider = ({ children }) => {
  const user = { role: 'admin' }; // On simule un utilisateur admin
  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Mock du service de suppression
const deleteMember = (id) => {
  return new Promise((resolve) => {
    console.log(`Simulating deletion of member with ID: ${id}`);
    setTimeout(() => {
      resolve();
    }, 500);
  });
};

// --- Composant Modal de Confirmation ---
const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all duration-300 scale-100">
      <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          Confirmer
        </button>
      </div>
    </div>
  </div>
);

// --- Composant MemberCard amélioré ---

const DEFAULT_PROFILE_PIC = 'https://placehold.co/112x112/A7F3D0/065F46?text=👤';

// Le composant MemberCard principal
const MemberCard = ({ member, onDelete, onEdit }) => {
  // Utilise le hook useAuth pour vérifier le rôle de l'utilisateur
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // État local pour gérer l'affichage de la modal
  const [showModal, setShowModal] = useState(false);

  const handleDeleteClick = () => {
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    setShowModal(false);
    try {
      await deleteMember(member.id);
      onDelete(member.id);
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      // Gérer l'erreur avec une modal d'erreur si nécessaire
    }
  };

  const handleCancelDelete = () => {
    setShowModal(false);
  };

  const handleEditClick = () => {
    if (onEdit) {
      onEdit(member);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 flex flex-col items-center text-center border border-gray-200 hover:shadow-xl transition-shadow duration-300">
      <img
        src={member.photo_url || DEFAULT_PROFILE_PIC}
        alt={`${member.first_name} ${member.last_name}`}
        className="w-28 h-28 object-cover rounded-full mb-4 border-4 border-emerald-400 shadow-md"
        onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_PROFILE_PIC; }}
      />
      <h3 className="text-xl font-bold text-emerald-700 mb-2">{member.last_name} {member.first_name}</h3>
      <p className="text-md font-semibold text-gray-800 mb-1">
        Rôle: <span className="font-normal text-gray-700">{member.role || 'N/A'}</span>
      </p>
      <p className="text-gray-700 text-sm mb-1">
        Profession: <span className="font-normal">{member.profession || 'N/A'}</span>
      </p>
      <p className="text-gray-600 text-sm mb-1">
        Sexe: <span className="font-normal">{member.sex || 'N/A'}</span>
      </p>
      <p className="text-gray-600 text-sm mb-1">
        Contact: <span className="font-normal">{member.contact || 'N/A'}</span>
      </p>
      <p className="text-gray-600 text-sm mb-2">
        Entreprise: <span className="font-normal">{member.company_or_project || 'N/A'}</span>
      </p>
      
      {isAdmin && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleEditClick}
            className="px-4 py-2 text-sm rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
          >
            Éditer
          </button>
          <button
            onClick={handleDeleteClick}
            className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Supprimer
          </button>
        </div>
      )}

      {showModal && (
        <ConfirmationModal
          title="Confirmer la suppression"
          message={`Êtes-vous sûr de vouloir supprimer ${member.first_name} ${member.last_name} ? Cette action est irréversible.`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
};

// --- Composant App pour la démonstration ---
// Dans une application réelle, le composant MemberCard serait importé et utilisé.

const App = () => {
    const mockMember = {
        id: '1',
        first_name: 'Jean',
        last_name: 'Dupont',
        photo_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=facearea&facepad=2&w=256&h=256&q=80',
        role: 'member',
        profession: 'Développeur web',
        sex: 'Homme',
        contact: 'jean.dupont@email.com',
        company_or_project: 'Projet X'
    };

    const handleMemberDelete = (id) => {
        console.log(`Member with ID ${id} was deleted.`);
    };

    const handleMemberEdit = (member) => {
        console.log('Editing member:', member);
    };

    return (
      <div className="p-8 bg-gray-100 min-h-screen flex items-start justify-center">
        <MockAuthProvider>
          <div className="w-full max-w-sm">
            <MemberCard 
              member={mockMember} 
              onDelete={handleMemberDelete} 
              onEdit={handleMemberEdit}
            />
          </div>
        </MockAuthProvider>
      </div>
    );
};

export default App;
