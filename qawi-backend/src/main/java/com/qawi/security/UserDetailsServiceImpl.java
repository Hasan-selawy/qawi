package com.qawi.security;

import com.qawi.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        String normalized = email == null ? "" : email.toLowerCase().trim();
        return userRepository.findByEmail(normalized)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + normalized));
    }
}
