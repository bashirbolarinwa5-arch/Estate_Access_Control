package com.example.demo.service;

import com.example.demo.entity.Estate;
import com.example.demo.entity.User;
import com.example.demo.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /*
     * The JWT filter stores the username as the principal,
     * so resolving the real User (and therefore the estate)
     * is a lookup by that username.
     *
     * Returns null when there is no authenticated estate
     * user (anonymous request or SUPER_ADMIN).
     */
    public User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            return null;
        }

        return userRepository
                .findByUsername(authentication.getName())
                .orElse(null);
    }

    /*
     * The estate of the acting user. SUPER_ADMIN has no
     * estate, so this returns null for them — estate
     * services must reject null with the "not linked"
     * message below.
     */
    public Estate getCurrentEstate() {

        User user = getCurrentUser();

        if (user == null) {
            return null;
        }

        return user.getEstate();
    }

    /*
     * Estate guard for every estate-scoped operation.
     */
    public Estate getRequiredEstate() {

        Estate estate = getCurrentEstate();

        if (estate == null) {
            throw new RuntimeException(
                    "Your account is not linked to an estate");
        }

        return estate;
    }

    /*
     * Every record inside an estate must carry that
     * estate. Shared check used by the estate services.
     */
    public void verifySameEstate(Estate actorEstate, Estate resourceEstate) {

        if (resourceEstate == null ||
                resourceEstate.getId() == null ||
                !resourceEstate.getId().equals(actorEstate.getId())) {

            throw new RuntimeException(
                    "This record does not belong to your estate");
        }
    }

}
