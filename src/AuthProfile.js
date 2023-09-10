export default function authenticateUser(redirect = false) {
    // Ensure user has an id
    let goldId = ensureUserId();

    // Fetch user profile if needed
    if (!hasValidProfile()) {
        fetchUserProfile(goldId, redirect);
    }
}

export function hasValidProfile() {
    let userProfile = JSON.parse(localStorage.getItem('user_profile'));
    return userProfile != null && !isExpired(userProfile.expirationDate);
}

export function getProfile() {
    return JSON.parse(localStorage.getItem('user_profile'));
}

function fetchUserProfile(goldId, redirect = false) {
    fetch('/api/auth/profile?goldId='+ goldId)
    .then(res => {
        if (!res.ok) { throw res.statusText; }
        return res;
    })
    .then(res => res.json())
    .then(res => {
        localStorage.setItem('user_profile', JSON.stringify(res));
        console.log("User profile retrieved.");
        if (redirect) {
            window.location.replace(window.location.origin);
        } else {
            window.location.replace(window.location.pathname);
        }
    })
    .catch(() => console.log("Error fetching user profile (this might be normal)."));
}

function ensureUserId() {
    var savedId = JSON.parse(localStorage.getItem('gold_uuid'));
    if (savedId == null) {
        let newId = crypto.randomUUID()
        localStorage.setItem('gold_uuid', JSON.stringify(newId));
        return newId;
    } else {
        return savedId;
    }
}

function isExpired(expirationDate) {
    return new Date(expirationDate) < new Date(new Date().toDateString());
}
